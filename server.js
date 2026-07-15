const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb, queryAll, queryOne, runSql } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/categorias', require('./routes/categories'));
app.use('/api/produtos', require('./routes/products'));
app.use('/api/pedidos', require('./routes/orders'));
app.use('/api/configuracoes', require('./routes/settings'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/pdv', require('./routes/pdv'));
app.use('/api/pizza', require('./routes/pizza'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/cupons', require('./routes/cupons'));

app.get('/api/dashboard', (req, res) => {
  const hoje = queryOne("SELECT COUNT(*) as pedidos, COALESCE(SUM(total),0) as faturamento FROM pedidos WHERE date(criado_em) = date('now','localtime') AND status != 'cancelado'");
  const seteDias = queryOne("SELECT COUNT(*) as pedidos, COALESCE(SUM(total),0) as faturamento FROM pedidos WHERE criado_em >= datetime('now','-7 days','localtime') AND status != 'cancelado'");
  const trintaDias = queryOne("SELECT COUNT(*) as pedidos, COALESCE(SUM(total),0) as faturamento FROM pedidos WHERE criado_em >= datetime('now','-30 days','localtime') AND status != 'cancelado'");
  const pedidosPendentes = queryOne("SELECT COUNT(*) as total FROM pedidos WHERE status IN ('novo','preparando')");
  const produtosAtivos = queryOne('SELECT COUNT(*) as total FROM produtos WHERE ativo = 1');
  const pedidosRecentes = queryAll('SELECT * FROM pedidos ORDER BY criado_em DESC LIMIT 5');

  function ticketMedio(pedidos, faturamento) {
    return pedidos > 0 ? faturamento / pedidos : 0;
  }

  res.json({
    hoje: {
      pedidos: hoje.pedidos,
      faturamento: hoje.faturamento,
      ticketMedio: ticketMedio(hoje.pedidos, hoje.faturamento)
    },
    seteDias: {
      pedidos: seteDias.pedidos,
      faturamento: seteDias.faturamento,
      ticketMedio: ticketMedio(seteDias.pedidos, seteDias.faturamento)
    },
    trintaDias: {
      pedidos: trintaDias.pedidos,
      faturamento: trintaDias.faturamento,
      ticketMedio: ticketMedio(trintaDias.pedidos, trintaDias.faturamento)
    },
    pedidosPendentes: pedidosPendentes.total,
    produtosAtivos: produtosAtivos.total,
    pedidosRecentes
  });
});

app.get('/api/publico/cardapio', (req, res) => {
  const categorias = queryAll('SELECT * FROM categorias WHERE ativo = 1 ORDER BY ordem');
  const produtos = queryAll('SELECT * FROM produtos WHERE ativo = 1 ORDER BY ordem');
  const configuracoes = queryAll('SELECT chave, valor FROM configuracoes');
  const configMap = {};
  configuracoes.forEach(c => { configMap[c.chave] = c.valor; });
  const pizzaConfigs = queryAll('SELECT pc.*, c.id as cat_id FROM pizza_config pc JOIN categorias c ON c.id = pc.categoria_id WHERE pc.ativo = 1');
  const pizzaMap = {};
  pizzaConfigs.forEach(pc => { pizzaMap[pc.categoria_id] = true; });
  res.json({ categorias, produtos, configuracoes: configMap, pizza_categorias: pizzaMap });
});

app.get('/api/config/impressora', (req, res) => {
  const chaves = ['impressora_nome', 'impressora_papel', 'impressora_automatico'];
  const configs = queryAll("SELECT chave, valor FROM configuracoes WHERE chave IN ('" + chaves.join("','") + "')");
  const result = { nome: '', papel: '80mm', automatico: '0' };
  configs.forEach(c => {
    if (c.chave === 'impressora_nome') result.nome = c.valor;
    if (c.chave === 'impressora_papel') result.papel = c.valor;
    if (c.chave === 'impressora_automatico') result.automatico = c.valor;
  });
  res.json(result);
});

var impressaoTesteCache = {};

app.put('/api/config/impressora', (req, res) => {
  const { nome, papel, automatico } = req.body;
  if (nome !== undefined) runSql("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES ('impressora_nome', ?)", [nome]);
  if (papel !== undefined) runSql("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES ('impressora_papel', ?)", [papel]);
  if (automatico !== undefined) runSql("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES ('impressora_automatico', ?)", [automatico]);
  res.json({ ok: true });
});

app.post('/api/admin/login', (req, res) => {
  const { usuario, senha } = req.body;
  const configs = queryAll('SELECT chave, valor FROM configuracoes WHERE chave IN (\'admin_login\', \'admin_senha\')');
  const configMap = {};
  configs.forEach(c => { configMap[c.chave] = c.valor; });
  const adminLogin = (configMap['admin_login'] || 'titanio').toLowerCase().trim();
  const adminSenha = configMap['admin_senha'] || '31599198';
  if (usuario.toLowerCase().trim() === adminLogin && senha === adminSenha) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos!' });
  }
});

app.put('/api/admin/senha', (req, res) => {
  const { senha_atual, login_novo, senha_nova } = req.body;
  const configs = queryAll('SELECT chave, valor FROM configuracoes WHERE chave IN (\'admin_login\', \'admin_senha\')');
  const configMap = {};
  configs.forEach(c => { configMap[c.chave] = c.valor; });
  const adminLogin = (configMap['admin_login'] || 'titanio').toLowerCase().trim();
  const adminSenha = configMap['admin_senha'] || '31599198';
  if (senha_atual !== adminSenha) {
    return res.status(401).json({ ok: false, erro: 'Senha atual incorreta!' });
  }
  if (login_novo && login_novo.trim()) {
    runSql("INSERT OR REPLACE INTO configuracoes (chave, valor, tipo, descricao) VALUES ('admin_login', ?, 'texto', 'Login do administrador')", [login_novo.trim()]);
  }
  if (senha_nova && senha_nova.trim()) {
    runSql("INSERT OR REPLACE INTO configuracoes (chave, valor, tipo, descricao) VALUES ('admin_senha', ?, 'texto', 'Senha do administrador')", [senha_nova.trim()]);
  }
  res.json({ ok: true });
});

app.post('/api/pdv/impressao-teste', (req, res) => {
  const id = Date.now().toString();
  impressaoTesteCache[id] = req.body.html;
  res.json({ id });
});

app.get('/api/pdv/impressao-teste-conteudo/:id', (req, res) => {
  const html = impressaoTesteCache[req.params.id];
  if (!html) return res.status(404).send('Não encontrado');
  res.send(html);
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📋 Cardápio: http://localhost:${PORT}`);
    console.log(`⚙️ Admin: http://localhost:${PORT}/admin`);
  });
}

start();
