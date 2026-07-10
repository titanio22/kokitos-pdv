const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'delivery.db');

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

let db;

function getDb() {
  return db;
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      icone TEXT DEFAULT '',
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      preco REAL NOT NULL,
      imagem TEXT DEFAULT '',
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_nome TEXT NOT NULL,
      cliente_telefone TEXT NOT NULL,
      cliente_endereco TEXT NOT NULL,
      cliente_observacao TEXT DEFAULT '',
      status TEXT DEFAULT 'novo',
      total REAL NOT NULL DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      atualizado_em TEXT DEFAULT (datetime('now','localtime'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS pedido_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      produto_id INTEGER,
      produto_nome TEXT NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 1,
      preco_unitario REAL NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL,
      tipo TEXT DEFAULT 'texto',
      descricao TEXT DEFAULT ''
    )
  `);
  const configsPadrao = [
    ['nome_empresa', "Kokito's Pizzaria", 'texto', 'Nome do estabelecimento'],
    ['telefone', '(11) 99999-8888', 'texto', 'Telefone para contato'],
    ['whatsapp', '5511999998888', 'texto', 'WhatsApp (número com DDI)'],
    ['endereco', 'Rua das Flores, 123 - Centro', 'texto', 'Endereço do estabelecimento'],
    ['horario_funcionamento', 'Seg-Sáb: 18h-23h | Dom: 18h-22h', 'texto', 'Horários de funcionamento'],
    ['taxa_entrega', '5.00', 'numero', 'Taxa de entrega padrão'],
    ['tempo_medio_entrega', '45-60', 'numero', 'Tempo médio de entrega em minutos'],
    ['cor_primaria', '#e74c3c', 'texto', 'Cor principal do sistema'],
    ['cor_secundaria', '#2c3e50', 'texto', 'Cor secundária do sistema'],
    ['frase_destaque', 'A melhor comida da região!', 'texto', 'Frase em destaque no cardápio'],
    ['pagamento_dinheiro', '1', 'booleano', 'Aceita pagamento em dinheiro'],
    ['pagamento_cartao', '1', 'booleano', 'Aceita pagamento em cartão'],
    ['pagamento_pix', '1', 'booleano', 'Aceita pagamento via PIX'],
    ['chave_pix', '11999998888', 'texto', 'Chave PIX para pagamento'],
    ['pdv_som_notificacao', '1', 'booleano', 'PDV: Som de notificação para novos pedidos'],
    ['pdv_auto_imprimir', '0', 'booleano', 'PDV: Imprimir automaticamente novos pedidos'],
    ['pdv_tempo_atualizacao', '5', 'numero', 'PDV: Tempo de atualização em segundos'],
    ['pdv_mostrar_entregues', '0', 'booleano', 'PDV: Mostrar pedidos entregues na tela'],
    ['recibo_cabecalho', "Kokito's Pizzaria", 'texto', 'Recibo: Texto do cabeçalho'],
    ['recibo_rodape', 'Obrigado pela preferência!', 'texto', 'Recibo: Texto do rodapé'],
    ['recibo_largura', '80', 'texto', 'Recibo: Largura do papel (58 ou 80 mm)'],
    ['recibo_mostrar_preco', '1', 'booleano', 'Recibo: Mostrar preços dos itens'],
    ['recibo_mostrar_endereco', '1', 'booleano', 'Recibo: Mostrar endereço do cliente'],
    ['recibo_mostrar_observacao', '1', 'booleano', 'Recibo: Mostrar observação do pedido'],
    ['funcionamento_aberto', '1', 'booleano', 'Loja aberta para pedidos'],
    ['funcionamento_segunda', '18:00-23:00', 'texto', 'Horário Segunda (ex: 18:00-23:00 ou "fechado")'],
    ['funcionamento_terca', '18:00-23:00', 'texto', 'Horário Terça'],
    ['funcionamento_quarta', '18:00-23:00', 'texto', 'Horário Quarta'],
    ['funcionamento_quinta', '18:00-23:00', 'texto', 'Horário Quinta'],
    ['funcionamento_sexta', '18:00-23:59', 'texto', 'Horário Sexta'],
    ['funcionamento_sabado', '18:00-23:59', 'texto', 'Horário Sábado'],
    ['funcionamento_domingo', '18:00-22:00', 'texto', 'Horário Domingo'],
  ];
  for (const [chave, valor, tipo, descricao] of configsPadrao) {
    try { db.run('INSERT OR IGNORE INTO configuracoes (chave, valor, tipo, descricao) VALUES (?, ?, ?, ?)', [chave, valor, tipo, descricao]); } catch(e) {}
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS chatbot_respostas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      palavras_chave TEXT NOT NULL,
      resposta TEXT NOT NULL,
      prioridade INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pizza_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER NOT NULL UNIQUE,
      ativo INTEGER DEFAULT 1,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pizza_tamanhos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pizza_config_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      max_sabores INTEGER NOT NULL DEFAULT 4,
      preco REAL NOT NULL DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (pizza_config_id) REFERENCES pizza_config(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pizza_sabores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pizza_config_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      preco_adicional REAL DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (pizza_config_id) REFERENCES pizza_config(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedido_item_sabores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_item_id INTEGER NOT NULL,
      sabor_id INTEGER,
      sabor_nome TEXT NOT NULL,
      FOREIGN KEY (pedido_item_id) REFERENCES pedido_itens(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pizza_bordas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pizza_config_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (pizza_config_id) REFERENCES pizza_config(id) ON DELETE CASCADE
    )
  `);

  try { db.run("ALTER TABLE categorias ADD COLUMN tipo TEXT DEFAULT 'normal'"); } catch(e) {}
  try { db.run("ALTER TABLE categorias ADD COLUMN pizza_config_id INTEGER DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE pedido_itens ADD COLUMN borda_id INTEGER DEFAULT NULL"); } catch(e) {}
  try { db.run("ALTER TABLE pedido_itens ADD COLUMN borda_nome TEXT DEFAULT ''"); } catch(e) {}
  try { db.run("ALTER TABLE pedido_itens ADD COLUMN borda_preco REAL DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE pizza_tamanhos ADD COLUMN min_sabores INTEGER DEFAULT 1"); } catch(e) {}
  try { db.run("ALTER TABLE pizza_tamanhos ADD COLUMN foto TEXT DEFAULT ''"); } catch(e) {}

  try { db.run("ALTER TABLE pedidos ADD COLUMN pagamento TEXT DEFAULT ''"); } catch(e) {}
  try { db.run("ALTER TABLE pedidos ADD COLUMN troco_para REAL DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE pedidos ADD COLUMN cartao_tipo TEXT DEFAULT ''"); } catch(e) {}
  try { db.run("ALTER TABLE pedidos ADD COLUMN cliente_id INTEGER DEFAULT NULL"); } catch(e) {}
  try { db.run("ALTER TABLE pedidos ADD COLUMN ponto_referencia TEXT DEFAULT ''"); } catch(e) {}
  try { db.run("ALTER TABLE pedidos ADD COLUMN endereco_confirmado INTEGER DEFAULT 0"); } catch(e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      endereco TEXT NOT NULL,
      ponto_referencia TEXT DEFAULT '',
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'percentual',
      valor REAL NOT NULL DEFAULT 0,
      tamanho_id INTEGER DEFAULT NULL,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  try { db.run("ALTER TABLE pedidos ADD COLUMN cupom_codigo TEXT DEFAULT ''"); } catch(e) {}
  try { db.run("ALTER TABLE pedidos ADD COLUMN cupom_desconto REAL DEFAULT 0"); } catch(e) {}

  const catCount = queryOne('SELECT COUNT(*) as total FROM categorias');
  if (!catCount || catCount.total === 0) {
    db.run("INSERT INTO categorias (nome, descricao, icone, ordem) VALUES ('Pizzas', 'Pizzas artesanais assadas no forno a lenha', '🍕', 1)");
    db.run("INSERT INTO pizza_config (categoria_id, ativo) VALUES (1, 1)");
    db.run("INSERT INTO pizza_tamanhos (pizza_config_id, nome, max_sabores, preco, ordem) VALUES (1,'Pequena',1,29.90,1)");
    db.run("INSERT INTO pizza_tamanhos (pizza_config_id, nome, max_sabores, preco, ordem) VALUES (1,'Média',2,39.90,2)");
    db.run("INSERT INTO pizza_tamanhos (pizza_config_id, nome, max_sabores, preco, ordem) VALUES (1,'Grande',3,49.90,3)");
    db.run("INSERT INTO pizza_tamanhos (pizza_config_id, nome, max_sabores, preco, ordem) VALUES (1,'Gigante',4,59.90,4)");
    db.run("INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ordem) VALUES (1,'Margherita','Molho de tomate, mussarela, manjericão',0,1)");
    db.run("INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ordem) VALUES (1,'Calabresa','Calabresa, cebola, azeitona',0,2)");
    db.run("INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ordem) VALUES (1,'Portuguesa','Presunto, mussarela, ovo, cebola, pimentão',0,3)");
    db.run("INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ordem) VALUES (1,'Frango Catupiry','Frango desfiado, catupiry, milho',0,4)");
    db.run("INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ordem) VALUES (1,'Mussarela','Mussarela, tomate, orégano',0,5)");
    db.run("INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ordem) VALUES (1,'Napolitana','Mussarela, tomate, parmesão, manjericão',0,6)");
    db.run("INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ordem) VALUES (1,'Bacon','Bacon crocante, mussarela, barbecue',0,7)");
    db.run("INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ordem) VALUES (1,'Chocolate','Chocolate ao leite, granulado, morango',0,8)");
    db.run("INSERT INTO pizza_bordas (pizza_config_id, nome, preco, ordem) VALUES (1,'Sem borda',0,1)");
    db.run("INSERT INTO pizza_bordas (pizza_config_id, nome, preco, ordem) VALUES (1,'Catupiry',5.00,2)");
    db.run("INSERT INTO pizza_bordas (pizza_config_id, nome, preco, ordem) VALUES (1,'Cheddar',5.00,3)");
    db.run("INSERT INTO pizza_bordas (pizza_config_id, nome, preco, ordem) VALUES (1,'Chocolate',7.00,4)");
    saveDb();
  }

  db.run('PRAGMA foreign_keys = ON');
  saveDb();
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(sql, params = []) {
  db.run('PRAGMA foreign_keys = ON');
  db.run(sql, params);
  const rows = db.exec("SELECT last_insert_rowid() as id, changes() as changes");
  saveDb();
  let lastInsertRowid = 0;
  let changes = 0;
  if (rows && rows[0] && rows[0].values && rows[0].values[0]) {
    lastInsertRowid = rows[0].values[0][0];
    changes = rows[0].values[0][1];
  }
  return { changes, lastInsertRowid };
}

module.exports = { initDb, getDb, queryAll, queryOne, runSql, saveDb };
