let cardapio = { categorias: [], produtos: [], configuracoes: {}, pizza_categorias: {} };
let carrinho = [];
let categoriaAtiva = null;
let pizzaData = {};
let pizzaSelecao = { tamanho: null, sabores: [], borda: null };
let clienteLogado = null;
let cupomAplicado = null;

function carregarCardapio() {
  var saved = sessionStorage.getItem('cliente_logado');
  if (saved) {
    try { clienteLogado = JSON.parse(saved); } catch(e) {}
  }
  fetch('/api/publico/cardapio')
    .then(r => r.json())
    .then(data => {
      cardapio = data;
      aplicarConfiguracoes();
      renderizarCategorias();
      atualizarUserInfo();
    });
}

function atualizarUserInfo() {
  var el = document.getElementById('user-info');
  if (clienteLogado) {
    el.innerHTML = '👤 ' + clienteLogado.nome + ' <small style="font-weight:400;cursor:pointer" onclick="sairCliente()">(sair)</small>';
    document.getElementById('rastreio-link').innerHTML = '📦 Meus Pedidos';
  } else {
    el.innerHTML = '👤 Entrar / Cadastrar';
    el.onclick = function() { abrirLogin(); };
    document.getElementById('rastreio-link').innerHTML = '📦 Rastrear Pedido';
  }
}

function abrirLogin() {
  document.getElementById('login-titulo').textContent = '👤 Entrar';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('cadastro-form').style.display = 'none';
  document.getElementById('input-login').value = '';
  document.getElementById('input-senha').value = '';
  document.getElementById('login-modal').style.display = 'flex';
}

function mostrarCadastro() {
  document.getElementById('login-titulo').textContent = '📝 Cadastro';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('cadastro-form').style.display = 'block';
}

function mostrarLogin() {
  document.getElementById('login-titulo').textContent = '👤 Entrar';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('cadastro-form').style.display = 'none';
}

function entrarCliente() {
  var login = document.getElementById('input-login').value.trim();
  var senha = document.getElementById('input-senha').value;
  if (!login || !senha) { alert('Preencha login e senha'); return; }
  fetch('/api/clientes/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, senha })
  }).then(r => r.json()).then(data => {
    if (data.erro) { alert(data.erro); return; }
    clienteLogado = data;
    sessionStorage.setItem('cliente_logado', JSON.stringify(data));
    atualizarUserInfo();
    fecharModal('login-modal');
  });
}

function cadastrarCliente() {
  var dados = {
    login: document.getElementById('cad-login').value.trim(),
    senha: document.getElementById('cad-senha').value,
    nome: document.getElementById('cad-nome').value.trim(),
    telefone: document.getElementById('cad-telefone').value.trim(),
    endereco: document.getElementById('cad-endereco').value.trim(),
    ponto_referencia: document.getElementById('cad-ref').value.trim()
  };
  if (!dados.login || !dados.senha || !dados.nome || !dados.telefone || !dados.endereco) {
    alert('Preencha todos os campos obrigatórios'); return;
  }
  fetch('/api/clientes/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  }).then(r => r.json()).then(data => {
    if (data.erro) { alert(data.erro); return; }
    clienteLogado = data;
    sessionStorage.setItem('cliente_logado', JSON.stringify(data));
    atualizarUserInfo();
    fecharModal('login-modal');
  });
}

function sairCliente() {
  clienteLogado = null;
  sessionStorage.removeItem('cliente_logado');
  atualizarUserInfo();
  carrinho = [];
  atualizarCarrinho();
}

function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

var rastreioAudioCtx = null;
var rastreioStatusAnterior = {};

function tocarSomRastreio(status) {
  try {
    if (!rastreioAudioCtx) rastreioAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var ctx = rastreioAudioCtx;
    var sons = {
      novo: function() {
        [523, 659, 784].forEach(function(f, i) {
          var o = ctx.createOscillator(); var g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = f; o.type = 'sine';
          g.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.15);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
          o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
      },
      preparando: function() {
        var o = ctx.createOscillator(); var g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 440; o.type = 'triangle';
        g.gain.setValueAtTime(0.5, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.6);
      },
      saiu_entrega: function() {
        [523, 784].forEach(function(f, i) {
          var o = ctx.createOscillator(); var g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = f; o.type = 'square';
          g.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.25);
          o.start(ctx.currentTime + i * 0.2); o.stop(ctx.currentTime + i * 0.2 + 0.25);
        });
      },
      entregue: function() {
        [523, 659, 784, 1047].forEach(function(f, i) {
          var o = ctx.createOscillator(); var g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = f; o.type = 'sine';
          g.gain.setValueAtTime(0.5, ctx.currentTime + i * 0.18);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.4);
          o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.4);
        });
      }
    };
    if (sons[status]) sons[status]();
  } catch(e) {}
}

var rastreioInterval = null;

function abrirRastreio() {
  if (clienteLogado) {
    buscarPedidosCliente();
  } else {
    document.getElementById('rastreio-login').style.display = 'block';
    document.getElementById('rastreio-meus-pedidos').style.display = 'none';
    document.getElementById('rastreio-resultado').innerHTML = '';
  }
  document.getElementById('rastreio-modal').style.display = 'flex';
}

function fecharRastreio() {
  document.getElementById('rastreio-modal').style.display = 'none';
  if (rastreioInterval) { clearInterval(rastreioInterval); rastreioInterval = null; }
}

var rastreioTelAtual = null;
var rastreioTabForcada = null;

function buscarPedidosRastreio() {
  var tel = document.getElementById('rastreio-telefone').value.trim();
  if (!tel) { alert('Digite seu telefone'); return; }
  rastreioTelAtual = tel;
  fetch('/api/pedidos/rastreio/' + encodeURIComponent(tel))
    .then(function(r) { return r.json(); })
    .then(function(pedidos) {
      var div = document.getElementById('rastreio-resultado');
      if (!pedidos || pedidos.length === 0) {
        div.innerHTML = '<p style="text-align:center;color:#999;padding:20px">Nenhum pedido encontrado para este telefone.</p>';
        return;
      }
      pedidos.forEach(function(p) {
        rastreioStatusAnterior[p.id] = p.status;
      });
      div.innerHTML = '<h3 style="margin:12px 0">Pedidos encontrados (' + pedidos.length + '):</h3>';
      pedidos.forEach(function(p) { div.innerHTML += renderizarCardRastreio(p); });
      if (rastreioInterval) clearInterval(rastreioInterval);
      rastreioInterval = setInterval(function() {
        var tel2 = rastreioTelAtual;
        if (!tel2) return;
        fetch('/api/pedidos/rastreio/' + encodeURIComponent(tel2))
          .then(function(r) { return r.json(); })
          .then(function(novos) {
            var div2 = document.getElementById('rastreio-resultado');
            novos.forEach(function(p) {
              var ant = rastreioStatusAnterior[p.id];
              if (ant && ant !== p.status) tocarSomRastreio(p.status);
              rastreioStatusAnterior[p.id] = p.status;
            });
            div2.innerHTML = '<h3 style="margin:12px 0">Pedidos encontrados (' + novos.length + '):</h3>';
            novos.forEach(function(p) { div2.innerHTML += renderizarCardRastreio(p); });
          });
      }, 6000);
    });
}

var rastreioAtivos = [];
var rastreioAnteriores = [];

function rastreioTabAtivos() {
  document.getElementById('rastreio-tab-ativos').classList.add('ativo');
  document.getElementById('rastreio-tab-anteriores').classList.remove('ativo');
  document.getElementById('rastreio-pedidos-list').style.display = 'block';
  document.getElementById('rastreio-pedidos-anteriores-list').style.display = 'none';
}

function rastreioTabAnteriores() {
  document.getElementById('rastreio-tab-ativos').classList.remove('ativo');
  document.getElementById('rastreio-tab-anteriores').classList.add('ativo');
  document.getElementById('rastreio-pedidos-list').style.display = 'none';
  document.getElementById('rastreio-pedidos-anteriores-list').style.display = 'block';
}

function buscarPedidosCliente() {
  fetch('/api/pedidos/cliente/' + clienteLogado.id)
    .then(function(r) { return r.json(); })
    .then(function(pedidos) {
      document.getElementById('rastreio-login').style.display = 'none';
      document.getElementById('rastreio-meus-pedidos').style.display = 'block';
      rastreioAtivos = pedidos.filter(function(p) { return p.status !== 'entregue' && p.status !== 'cancelado'; });
      rastreioAnteriores = pedidos.filter(function(p) { return p.status === 'entregue'; });

      rastreioAtivos.forEach(function(p) {
        var ant = rastreioStatusAnterior[p.id];
        if (ant && ant !== p.status) tocarSomRastreio(p.status);
        rastreioStatusAnterior[p.id] = p.status;
      });

      var divAtivos = document.getElementById('rastreio-pedidos-list');
      var divAntigos = document.getElementById('rastreio-pedidos-anteriores-list');

      if (rastreioAtivos.length === 0) {
        divAtivos.innerHTML = '<p style="text-align:center;color:#999;padding:20px">Nenhum pedido em andamento.</p>';
      } else {
        divAtivos.innerHTML = '';
        rastreioAtivos.forEach(function(p) { divAtivos.innerHTML += renderizarCardRastreio(p, false); });
      }

      if (rastreioAnteriores.length === 0) {
        divAntigos.innerHTML = '<p style="text-align:center;color:#999;padding:20px">Nenhum pedido anterior.</p>';
      } else {
        divAntigos.innerHTML = '';
        rastreioAnteriores.forEach(function(p) { divAntigos.innerHTML += renderizarCardRastreio(p, true); });
      }

      if (rastreioTabForcada === 'anteriores') rastreioTabAnteriores();
      else rastreioTabAtivos();
      rastreioTabForcada = null;

      if (rastreioInterval) clearInterval(rastreioInterval);
      rastreioInterval = setInterval(function() {
        fetch('/api/pedidos/cliente/' + clienteLogado.id)
          .then(function(r) { return r.json(); })
          .then(function(novos) {
            var ativos2 = novos.filter(function(p) { return p.status !== 'entregue' && p.status !== 'cancelado'; });
            var antigos2 = novos.filter(function(p) { return p.status === 'entregue'; });
            var divA = document.getElementById('rastreio-pedidos-list');
            var divAnt = document.getElementById('rastreio-pedidos-anteriores-list');

            ativos2.forEach(function(p) {
              var ant = rastreioStatusAnterior[p.id];
              if (ant && ant !== p.status) tocarSomRastreio(p.status);
              rastreioStatusAnterior[p.id] = p.status;
            });

            if (ativos2.length === 0) {
              divA.innerHTML = '<p style="text-align:center;color:#999;padding:20px">Nenhum pedido em andamento.</p>';
            } else {
              divA.innerHTML = '';
              ativos2.forEach(function(p) { divA.innerHTML += renderizarCardRastreio(p, false); });
            }

            if (antigos2.length === 0) {
              divAnt.innerHTML = '<p style="text-align:center;color:#999;padding:20px">Nenhum pedido anterior.</p>';
            } else {
              divAnt.innerHTML = '';
              antigos2.forEach(function(p) { divAnt.innerHTML += renderizarCardRastreio(p, true); });
            }

            rastreioAtivos = ativos2;
            rastreioAnteriores = antigos2;
          });
      }, 6000);
    });
}

function voltarRastreio() {
  if (rastreioInterval) { clearInterval(rastreioInterval); rastreioInterval = null; }
  document.getElementById('rastreio-login').style.display = 'block';
  document.getElementById('rastreio-meus-pedidos').style.display = 'none';
  document.getElementById('rastreio-resultado').innerHTML = '';
  document.getElementById('rastreio-telefone').value = '';
  rastreioTelAtual = null;
}

function renderizarCardRastreio(pedido, mostrarRepetir) {
  var statusMap = {
    novo: { label: 'Pedido Recebido', icon: '📥', cor: '#f39c12' },
    preparando: { label: 'Preparando', icon: '👨‍🍳', cor: '#3498db' },
    saiu_entrega: { label: 'Saiu para Entrega', icon: '🛵', cor: '#e67e22' },
    entregue: { label: 'Entregue', icon: '✅', cor: '#2ecc71' },
    cancelado: { label: 'Cancelado', icon: '❌', cor: '#e74c3c' }
  };
  var s = statusMap[pedido.status] || { label: pedido.status, icon: '📋', cor: '#999' };
  var total = 'R$ ' + parseFloat(pedido.total).toFixed(2).replace('.', ',');

  var timestamps = [];
  if (pedido.criado_em) timestamps.push({ label: 'Pedido recebido', icon: '📥', data: pedido.criado_em, ativo: true });
  timestamps.push({ label: 'Preparando', icon: '👨‍🍳', data: pedido.atualizado_em, ativo: pedido.status === 'preparando' || pedido.status === 'saiu_entrega' || pedido.status === 'entregue' });
  timestamps.push({ label: 'Saiu para entrega', icon: '🛵', ativo: pedido.status === 'saiu_entrega' || pedido.status === 'entregue' });
  timestamps.push({ label: 'Entregue', icon: '✅', ativo: pedido.status === 'entregue' });

  var botoes = '';
  if (mostrarRepetir) {
    botoes = '<button class="btn-repetir" onclick="repetirPedido(' + pedido.id + ')">🔄 Repetir Pedido</button> ' +
             '<button class="btn-excluir-anterior" onclick="excluirPedidoAnterior(' + pedido.id + ')">🗑️ Excluir</button>';
  }

  return '<div class="rastreio-card" style="border:1px solid #ddd;border-radius:10px;padding:16px;margin-bottom:12px;background:#fff">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<strong>Pedido #' + pedido.id + '</strong>' +
      '<span style="background:' + s.cor + ';color:#fff;padding:4px 10px;border-radius:20px;font-size:0.8rem">' + s.icon + ' ' + s.label + '</span>' +
    '</div>' +
    '<p style="font-size:0.85rem;color:#666;margin-bottom:8px">' + (pedido.cliente_endereco || '') + '</p>' +
    '<p style="font-size:0.9rem;font-weight:600;color:var(--cor-primaria);margin-bottom:12px">Total: ' + total + '</p>' +
    '<div class="rastreio-timeline" style="display:flex;justify-content:space-between;position:relative">' +
      timestamps.map(function(t, i) {
        var cor = t.ativo ? t.cor || s.cor : '#ddd';
        return '<div style="flex:1;text-align:center;position:relative;z-index:1">' +
          '<div style="width:32px;height:32px;border-radius:50%;background:' + cor + ';color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 4px;font-size:0.9rem">' + t.icon + '</div>' +
          '<div style="font-size:0.7rem;color:' + (t.ativo ? '#333' : '#bbb') + '">' + t.label + '</div>' +
          (t.data ? '<div style="font-size:0.65rem;color:#999">' + t.data.replace('T',' ').substring(0,16) + '</div>' : '') +
        '</div>';
      }).join('') +
    '</div>' +
    '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #eee">' +
      '<p style="font-size:0.8rem;color:#666">Itens:</p>' +
      (pedido.itens ? pedido.itens.map(function(i) {
        return '<p style="font-size:0.8rem;margin:2px 0">' + i.quantidade + 'x ' + i.produto_nome + ' - R$ ' + parseFloat(i.preco_unitario).toFixed(2).replace('.',',') + '</p>';
      }).join('') : '') +
    '</div>' +
    (botoes ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #eee;text-align:right;display:flex;gap:8px;justify-content:flex-end">' + botoes + '</div>' : '') +
  '</div>';
}

function verificarLogin() {
  if (!clienteLogado) {
    abrirLogin();
    return false;
  }
  return true;
}

function aplicarConfiguracoes() {
  const c = cardapio.configuracoes;
  if (c.nome_empresa) {
    document.getElementById('nome-empresa').textContent = c.nome_empresa;
    document.title = `Cardápio - ${c.nome_empresa}`;
  }
  if (c.frase_destaque) document.getElementById('frase-destaque').textContent = c.frase_destaque;
  if (c.telefone) document.getElementById('header-telefone').textContent = `📞 ${c.telefone}`;
  if (c.horario_funcionamento) document.getElementById('header-horario').textContent = `🕐 ${c.horario_funcionamento}`;
  if (c.cor_primaria) document.documentElement.style.setProperty('--cor-primaria', c.cor_primaria);
  if (c.cor_secundaria) document.documentElement.style.setProperty('--cor-secundaria', c.cor_secundaria);
  document.getElementById('footer-info').textContent = `${c.nome_empresa || 'Kokito\'s Pizzaria'} - Todos os direitos reservados`;

  const pagamentoDiv = document.getElementById('opcoes-pagamento');
  pagamentoDiv.innerHTML = '';
  if (c.pagamento_dinheiro === '1') {
    const btn = document.createElement('div');
    btn.className = 'opcao-pagamento';
    btn.textContent = '💵 Dinheiro';
    btn.onclick = function() { selecionarPagamento('dinheiro'); };
    pagamentoDiv.appendChild(btn);
  }
  if (c.pagamento_cartao === '1') {
    const btn = document.createElement('div');
    btn.className = 'opcao-pagamento';
    btn.textContent = '💳 Cartão';
    btn.onclick = function() { selecionarPagamento('cartao'); };
    pagamentoDiv.appendChild(btn);
  }
  if (c.pagamento_pix === '1') {
    const btn = document.createElement('div');
    btn.className = 'opcao-pagamento';
    btn.textContent = '📱 PIX';
    btn.onclick = function() { selecionarPagamento('pix'); };
    pagamentoDiv.appendChild(btn);
  }
  if (c.chave_pix) document.getElementById('pix-chave').textContent = c.chave_pix;
}

let pagamentoSelecionado = null;
let cartaoTipo = null;
function selecionarPagamento(tipo) {
  pagamentoSelecionado = tipo;
  cartaoTipo = null;
  document.querySelectorAll('.opcao-pagamento').forEach(function(el) { el.classList.remove('selecionado'); });
  event.target.classList.add('selecionado');
  document.getElementById('pix-info').style.display = tipo === 'pix' ? 'block' : 'none';
  document.getElementById('troco-area').style.display = tipo === 'dinheiro' ? 'block' : 'none';
  document.getElementById('cartao-tipo-area').style.display = tipo === 'cartao' ? 'block' : 'none';
  if (tipo !== 'dinheiro') { document.getElementById('troco-resultado').style.display = 'none'; }
  if (tipo !== 'cartao') { cartaoTipo = null; }
}
function selecionarTipoCartao(tipo, el) {
  cartaoTipo = tipo;
  document.querySelectorAll('#opcoes-cartao .opcao-pagamento').forEach(function(e) { e.classList.remove('selecionado'); });
  el.classList.add('selecionado');
}

function renderizarCategorias() {
  const container = document.getElementById('categorias-list');
  container.innerHTML = '';

  cardapio.categorias.forEach(function(cat) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = (cat.icone || '📋') + ' ' + cat.nome;
    btn.onclick = function() {
      categoriaAtiva = cat.id;
      document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.remove('ativo'); });
      btn.classList.add('ativo');
      if (cardapio.pizza_categorias && cardapio.pizza_categorias[cat.id]) {
        verificarPizzaCategoria(cat.id);
      } else {
        pizzaData = {};
        renderizarProdutos();
      }
    };
    container.appendChild(btn);
  });

  if (!categoriaAtiva && cardapio.categorias.length > 0) {
    var primeira = cardapio.categorias[0];
    categoriaAtiva = primeira.id;
    var btnPrimeiro = container.querySelector('.cat-btn');
    if (btnPrimeiro) btnPrimeiro.classList.add('ativo');
    if (cardapio.pizza_categorias && cardapio.pizza_categorias[primeira.id]) {
      verificarPizzaCategoria(primeira.id);
    } else {
      renderizarProdutos();
    }
  }
}

function verificarPizzaCategoria(categoriaId) {
  fetch('/api/pizza/config/' + categoriaId)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ativo && data.tamanhos && data.tamanhos.length > 0) {
        pizzaData = data;
        renderizarPizzas();
      } else {
        pizzaData = {};
        renderizarProdutos();
      }
    });
}

function renderizarPizzas() {
  const container = document.getElementById('produtos-grid');
  container.innerHTML = '';

  if (!pizzaData.tamanhos || pizzaData.tamanhos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Nenhum tamanho de pizza cadastrado.</p></div>';
    return;
  }

  container.innerHTML += '<div class="pizza-titulo">🍕 Escolha o TAMANHO da pizza:</div>';

  pizzaData.tamanhos.forEach(function(t) {
    var minS = t.min_sabores || 1;
    var maxS = t.max_sabores;
    var saborTexto = (minS === maxS ? maxS : minS + '-' + maxS) + (maxS === 1 ? ' sabor' : ' sabores');
    var card = document.createElement('div');
    card.className = 'produto-card pizza-size-card';
    card.innerHTML =
      '<div class="produto-img">' + (t.foto ? '<img src="' + t.foto + '" alt="' + t.nome + '">' : '🍕') + '</div>' +
      '<div class="produto-body">' +
        '<h3>' + t.nome + '</h3>' +
        '<p><strong>' + saborTexto + '</strong></p>' +
        '<div class="produto-footer">' +
          '<span class="produto-preco">R$ ' + t.preco.toFixed(2).replace('.', ',') + '</span>' +
          '<button class="btn btn-primary btn-sm" onclick="abrirSelecaoSabores(' + t.id + ', \'' + t.nome.replace(/'/g, "\\'") + '\', ' + minS + ', ' + maxS + ', ' + t.preco + ')">Escolher</button>' +
        '</div>' +
      '</div>';
    container.appendChild(card);
  });
}

function renderizarProdutos() {
  const container = document.getElementById('produtos-grid');
  container.innerHTML = '';

  var produtos = cardapio.produtos;
  if (categoriaAtiva) produtos = produtos.filter(function(p) { return p.categoria_id === categoriaAtiva; });

  if (produtos.length === 0) {
    return;
  }

  produtos.forEach(function(prod) {
    var cat = null;
    cardapio.categorias.forEach(function(c) { if (c.id === prod.categoria_id) cat = c; });
    var card = document.createElement('div');
    card.className = 'produto-card';
    card.innerHTML =
      '<div class="produto-img">' + (cat ? cat.icone : '🍽️') + '</div>' +
      '<div class="produto-body">' +
        '<h3>' + prod.nome + '</h3>' +
        '<p>' + (prod.descricao || '') + '</p>' +
        '<div class="produto-footer">' +
          '<span class="produto-preco">R$ ' + prod.preco.toFixed(2).replace('.', ',') + '</span>' +
          '<button class="btn btn-primary btn-sm" onclick="adicionarAoCarrinho(' + prod.id + ')">+ Adicionar</button>' +
        '</div>' +
      '</div>';
    container.appendChild(card);
  });
}

function abrirSelecaoSabores(tamanhoId, tamanhoNome, minSabores, maxSabores, precoBase) {
  if (!verificarLogin()) return;

  pizzaSelecao = {
    tamanho: { id: tamanhoId, nome: tamanhoNome, minSabores: minSabores, maxSabores: maxSabores, preco: precoBase },
    sabores: [],
    borda: null
  };
  document.getElementById('pizza-tamanho-label').textContent = tamanhoNome + ' — R$ ' + precoBase.toFixed(2).replace('.', ',');
  document.getElementById('pizza-max-sabores').textContent = (minSabores === maxSabores ? 'Escolha ' + maxSabores : 'Mín ' + minSabores + ', máx ' + maxSabores) + ' sabor(es)';
  document.getElementById('pizza-contador').textContent = '0/' + maxSabores;

  var bordaSection = document.getElementById('pizza-bordas-section');
  var bordaGrid = document.getElementById('pizza-bordas-grid');
  bordaGrid.innerHTML = '';
  if (pizzaData.bordas && pizzaData.bordas.length > 0) {
    bordaSection.style.display = 'block';
    pizzaData.bordas.forEach(function(b) {
      var btn = document.createElement('button');
      btn.className = 'pizza-sabor-btn';
      btn.dataset.id = b.id;
      btn.dataset.nome = b.nome;
      btn.dataset.preco = b.preco || 0;
      btn.innerHTML = b.nome + (b.preco > 0 ? ' <small>+R$' + b.preco.toFixed(2).replace('.', ',') + '</small>' : '');
      btn.onclick = function() { selecionarBorda(this, b.id, b.nome, b.preco); };
      if (b.preco === 0) { btn.classList.add('selecionado'); pizzaSelecao.borda = { id: b.id, nome: b.nome, preco: 0 }; }
      bordaGrid.appendChild(btn);
    });
  } else {
    bordaSection.style.display = 'none';
  }

  var grid = document.getElementById('pizza-sabores-grid');
  grid.innerHTML = '';
  if (pizzaData.sabores && pizzaData.sabores.length > 0) {
    pizzaData.sabores.forEach(function(s) {
      var btn = document.createElement('button');
      btn.className = 'pizza-sabor-btn';
      btn.dataset.id = s.id;
      btn.dataset.nome = s.nome;
      btn.dataset.preco = s.preco_adicional || 0;
      btn.innerHTML = s.nome + (s.preco_adicional > 0 ? ' <small>+R$' + s.preco_adicional.toFixed(2).replace('.', ',') + '</small>' : '');
      btn.onclick = function() { toggleSabor(this); };
      grid.appendChild(btn);
    });
  }

  document.getElementById('pizza-modal').style.display = 'flex';
  atualizarPrecoPizza();
}

function selecionarBorda(btn, id, nome, preco) {
  document.querySelectorAll('#pizza-bordas-grid .pizza-sabor-btn').forEach(function(b) { b.classList.remove('selecionado'); });
  btn.classList.add('selecionado');
  pizzaSelecao.borda = { id: id, nome: nome, preco: preco };
  atualizarPrecoPizza();
}

function toggleSabor(btn) {
  var id = parseInt(btn.dataset.id);
  var idx = -1;
  for (var i = 0; i < pizzaSelecao.sabores.length; i++) {
    if (pizzaSelecao.sabores[i].id === id) { idx = i; break; }
  }

  if (idx >= 0) {
    pizzaSelecao.sabores.splice(idx, 1);
    btn.classList.remove('selecionado');
  } else {
    if (pizzaSelecao.sabores.length >= pizzaSelecao.tamanho.maxSabores) {
      alert('Máximo de ' + pizzaSelecao.tamanho.maxSabores + ' sabor(es) já selecionado(s)!');
      return;
    }
    pizzaSelecao.sabores.push({ id: id, nome: btn.dataset.nome, preco: parseFloat(btn.dataset.preco) });
    btn.classList.add('selecionado');
  }

  document.getElementById('pizza-contador').textContent = pizzaSelecao.sabores.length + '/' + pizzaSelecao.tamanho.maxSabores;
  atualizarPrecoPizza();
}

function atualizarPrecoPizza() {
  var total = pizzaSelecao.tamanho.preco;
  pizzaSelecao.sabores.forEach(function(s) { total += s.preco; });
  if (pizzaSelecao.borda) total += pizzaSelecao.borda.preco;
  document.getElementById('pizza-preco-total').textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
}

function fecharModalPizza() {
  document.getElementById('pizza-modal').style.display = 'none';
}



function adicionarPizzaAoCarrinho() {
  if (pizzaSelecao.sabores.length < (pizzaSelecao.tamanho.minSabores || 1)) {
    alert('Selecione pelo menos ' + (pizzaSelecao.tamanho.minSabores || 1) + ' sabor(es)!');
    return;
  }

  var total = pizzaSelecao.tamanho.preco;
  var saboresNomes = [];
  pizzaSelecao.sabores.forEach(function(s) {
    total += s.preco;
    saboresNomes.push(s.nome);
  });
  if (pizzaSelecao.borda) total += pizzaSelecao.borda.preco;

  var bordaTexto = pizzaSelecao.borda && pizzaSelecao.borda.preco > 0 ? ' | Borda: ' + pizzaSelecao.borda.nome : '';
  var nomeItem = '🍕 Pizza ' + pizzaSelecao.tamanho.nome + ' (' + saboresNomes.join(', ') + ')' + bordaTexto;

  carrinho.push({
    produto_id: null,
    produto_nome: nomeItem,
    pizza_info: {
      tamanho_id: pizzaSelecao.tamanho.id,
      tamanho_nome: pizzaSelecao.tamanho.nome,
      sabores: pizzaSelecao.sabores.map(function(s) { return { id: s.id, nome: s.nome }; }),
      borda: pizzaSelecao.borda ? { id: pizzaSelecao.borda.id, nome: pizzaSelecao.borda.nome, preco: pizzaSelecao.borda.preco } : null
    },
    preco_unitario: total,
    quantidade: 1
  });

  fecharModalPizza();
  atualizarCarrinho();
  abrirCarrinho();
}

function adicionarAoCarrinho(produtoId) {
  if (!verificarLogin()) return;

  var produto = null;
  for (var i = 0; i < cardapio.produtos.length; i++) {
    if (cardapio.produtos[i].id === produtoId) { produto = cardapio.produtos[i]; break; }
  }
  if (!produto) return;

  var existente = null;
  for (var j = 0; j < carrinho.length; j++) {
    if (carrinho[j].produto_id === produtoId && !carrinho[j].pizza_info) { existente = carrinho[j]; break; }
  }
  if (existente) {
    existente.quantidade++;
  } else {
    carrinho.push({ produto_id: produto.id, produto_nome: produto.nome, preco_unitario: produto.preco, quantidade: 1 });
  }
  atualizarCarrinho();
}

function repetirPedido(pedidoId) {
  var pedido = null;
  for (var i = 0; i < rastreioAnteriores.length; i++) {
    if (rastreioAnteriores[i].id === pedidoId) { pedido = rastreioAnteriores[i]; break; }
  }
  if (!pedido) return;
  carrinho = [];
  for (var j = 0; j < pedido.itens.length; j++) {
    var item = pedido.itens[j];
    if (item.produto_id) {
      var qtd = item.quantidade;
      for (var k = 0; k < qtd; k++) adicionarAoCarrinho(item.produto_id);
    } else {
      var sabores = [];
      if (item.sabores) {
        for (var s = 0; s < item.sabores.length; s++) {
          sabores.push({ id: item.sabores[s].sabor_id, nome: item.sabores[s].sabor_nome });
        }
      }
      var borda = (item.borda_id && item.borda_preco > 0) ? { id: item.borda_id, nome: item.borda_nome, preco: item.borda_preco } : null;
      var tamanhoNome = '';
      var matchNome = item.produto_nome.match(/Pizza\s+(.+?)\s*\(/);
      if (matchNome) tamanhoNome = matchNome[1];
      carrinho.push({
        produto_id: null,
        produto_nome: item.produto_nome,
        pizza_info: {
          tamanho_id: null,
          tamanho_nome: tamanhoNome,
          sabores: sabores,
          borda: borda
        },
        preco_unitario: item.preco_unitario,
        quantidade: item.quantidade
      });
    }
  }
  fecharRastreio();
  atualizarCarrinho();
  abrirCarrinho();
  mostrarToast('🔄 Pedido #' + pedidoId + ' adicionado ao carrinho!');
}

function excluirPedidoAnterior(pedidoId) {
  if (!confirm('Cancelar pedido #' + pedidoId + '?')) return;
  rastreioTabForcada = 'anteriores';
  fetch('/api/pedidos/' + pedidoId + '/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelado' })
  })
    .then(function(r) { return r.json(); })
    .then(function() {
      buscarPedidosCliente();
      mostrarToast('🗑️ Pedido #' + pedidoId + ' cancelado');
    });
}

function mostrarToast(msg) {
  var el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--cor-primaria);color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);animation:fadeIn 0.3s;font-size:0.9rem';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function() { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(function() { el.remove(); }, 300); }, 3000);
}

function aumentarPizza(index) {
  if (carrinho[index] && carrinho[index].pizza_info) {
    carrinho[index].quantidade++;
    atualizarCarrinho();
  }
}

function diminuirPizza(index) {
  if (carrinho[index] && carrinho[index].pizza_info) {
    carrinho[index].quantidade--;
    if (carrinho[index].quantidade <= 0) carrinho.splice(index, 1);
    atualizarCarrinho();
  }
}

function removerDoCarrinho(produtoId, pizzaHash) {
  for (var i = 0; i < carrinho.length; i++) {
    if (pizzaHash !== undefined) {
      if (i === pizzaHash) { carrinho.splice(i, 1); break; }
    } else if (carrinho[i].produto_id === produtoId && !carrinho[i].pizza_info) {
      carrinho[i].quantidade--;
      if (carrinho[i].quantidade <= 0) carrinho.splice(i, 1);
      break;
    }
  }
  atualizarCarrinho();
}

function atualizarCarrinho() {
  var count = 0;
  var total = 0;
  for (var i = 0; i < carrinho.length; i++) {
    count += carrinho[i].quantidade;
    total += carrinho[i].preco_unitario * carrinho[i].quantidade;
  }

  var cartBtn = document.getElementById('carrinho-flutuante');
  if (cartBtn) cartBtn.style.display = count > 0 ? 'flex' : 'none';
  document.getElementById('carrinho-total').textContent = total.toFixed(2).replace('.', ',');
  document.getElementById('carrinho-count').textContent = count;

  var container = document.getElementById('carrinho-itens');
  container.innerHTML = '';
  if (carrinho.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Carrinho vazio</p>';
    return;
  }

  for (var k = 0; k < carrinho.length; k++) {
    (function(item, index) {
      var div = document.createElement('div');
      div.className = 'carrinho-item';
      var detalhe = '';
      if (item.pizza_info) {
        var bordaStr = item.pizza_info.borda && item.pizza_info.borda.preco > 0 ? ' | Borda: ' + item.pizza_info.borda.nome : '';
        detalhe = '<p style="font-size:0.75rem;color:#e74c3c">Tamanho: ' + item.pizza_info.tamanho_nome + ' | Sabores: ' + item.pizza_info.sabores.map(function(s) { return s.nome; }).join(', ') + bordaStr + '</p>';
      }
      div.innerHTML =
        '<div class="carrinho-item-info">' +
          '<h4>' + item.produto_nome + '</h4>' +
          detalhe +
          '<p>R$ ' + item.preco_unitario.toFixed(2).replace('.', ',') + '</p>' +
        '</div>' +
        '<div class="carrinho-item-acoes">' +
          '<button onclick="' + (item.pizza_info ? 'diminuirPizza(' + index + ')' : 'removerDoCarrinho(' + (item.produto_id || 0) + ',' + index + ')') + '">−</button>' +
          '<span class="qtd">' + item.quantidade + '</span>' +
          '<button onclick="' + (item.pizza_info ? 'aumentarPizza(' + index + ')' : 'adicionarAoCarrinho(' + (item.produto_id || 0) + ')') + '">+</button>' +
        '</div>';
      container.appendChild(div);
    })(carrinho[k], k);
  }
}

function abrirCarrinho() { document.getElementById('carrinho-modal').style.display = 'flex'; }
function fecharCarrinho() { document.getElementById('carrinho-modal').style.display = 'none'; }

function abrirCheckout() {
  if (carrinho.length === 0) return;
  if (clienteLogado) {
    document.getElementById('input-cliente-id').value = clienteLogado.id;
    document.getElementById('input-nome').value = clienteLogado.nome;
    document.getElementById('input-telefone').value = clienteLogado.telefone;
    document.getElementById('input-endereco').value = clienteLogado.endereco;
    document.getElementById('input-ref').value = clienteLogado.ponto_referencia || '';
  }
  document.getElementById('cupom-input').value = '';
  document.getElementById('cupom-info').style.display = 'none';
  cupomAplicado = null;
  atualizarTotalCheckout();
  fecharCarrinho();
  document.getElementById('checkout-modal').style.display = 'flex';
}

function trocarEndereco() {
  document.getElementById('input-endereco').value = '';
  document.getElementById('input-endereco').focus();
}
function fecharCheckout() { document.getElementById('checkout-modal').style.display = 'none'; }

function calcularSubtotal() {
  var total = 0;
  for (var i = 0; i < carrinho.length; i++) total += carrinho[i].preco_unitario * carrinho[i].quantidade;
  return total;
}

function validarCupom() {
  var codigo = document.getElementById('cupom-input').value.trim();
  if (!codigo) { alert('Digite o código do cupom'); return; }
  fetch('/api/cupons/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: codigo }) })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.valido) { alert(data.erro || 'Cupom inválido'); return; }
      var c = data.cupom;
      var subtotal = calcularSubtotal();
      var desconto = c.tipo === 'percentual' ? subtotal * c.valor / 100 : c.valor;
      if (desconto > subtotal) desconto = subtotal;
      cupomAplicado = { codigo: c.codigo, tipo: c.tipo, valor: c.valor, desconto: desconto };
      document.getElementById('cupom-info').style.display = 'block';
      document.getElementById('cupom-info').innerHTML = '🏷️ Cupom <strong>' + c.codigo + '</strong> aplicado: -R$ ' + desconto.toFixed(2).replace('.',',') + ' <small style="cursor:pointer;color:red" onclick="removerCupom()">(remover)</small>';
      atualizarTotalCheckout();
    });
}

function removerCupom() {
  cupomAplicado = null;
  document.getElementById('cupom-info').style.display = 'none';
  atualizarTotalCheckout();
}

function atualizarTotalCheckout() {
  var subtotal = calcularSubtotal();
  var desconto = cupomAplicado ? cupomAplicado.desconto : 0;
  var total = subtotal - desconto;
  var el = document.getElementById('checkout-total');
  if (el) {
    if (desconto > 0) {
      el.innerHTML = '<span style="color:#999;text-decoration:line-through">R$ ' + subtotal.toFixed(2).replace('.',',') + '</span> <strong style="color:var(--cor-primaria);font-size:1.1rem">R$ ' + total.toFixed(2).replace('.',',') + '</strong>';
    } else {
      el.innerHTML = '<strong>R$ ' + subtotal.toFixed(2).replace('.',',') + '</strong>';
    }
  }
}

function verificarFuncionamento() {
  var cfg = cardapio.configuracoes;
  if (cfg.funcionamento_aberto !== '1') {
    return 'A loja está fechada para pedidos no momento.';
  }
  var dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  var hoje = new Date().getDay();
  var chave = 'funcionamento_' + dias[hoje];
  var horario = cfg[chave];
  if (!horario || horario === 'fechado') {
    return 'A loja está fechada hoje.';
  }
  var partes = horario.split('-');
  if (partes.length !== 2) return null;
  var agora = new Date();
  var h = agora.getHours().toString().padStart(2, '0');
  var m = agora.getMinutes().toString().padStart(2, '0');
  var agoraStr = h + ':' + m;
  if (agoraStr < partes[0] || agoraStr > partes[1]) {
    return 'A loja está fechada no momento. Horário de funcionamento: ' + partes[0] + ' às ' + partes[1] + '.';
  }
  return null;
}

function enviarPedido(event) {
  event.preventDefault();

  var erroFunc = verificarFuncionamento();
  if (erroFunc) { alert(erroFunc); return; }

  var itensPedido = [];
  for (var i = 0; i < carrinho.length; i++) {
    var item = carrinho[i];
    itensPedido.push({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      pizza_info: item.pizza_info || null
    });
  }

  if (itensPedido.length === 0) { alert('Carrinho vazio!'); return; }

  var pedido = {
    cliente_id: clienteLogado ? clienteLogado.id : null,
    cliente_nome: document.getElementById('input-nome').value.trim(),
    cliente_telefone: document.getElementById('input-telefone').value.trim(),
    cliente_endereco: document.getElementById('input-endereco').value.trim(),
    cliente_observacao: document.getElementById('input-observacao').value.trim(),
    ponto_referencia: document.getElementById('input-ref').value.trim(),
    endereco_confirmado: 1,
    pagamento: pagamentoSelecionado,
    troco_para: pagamentoSelecionado === 'dinheiro' ? (parseFloat(document.getElementById('input-troco').value.replace(',','.')) || 0) : 0,
    cartao_tipo: pagamentoSelecionado === 'cartao' ? cartaoTipo : null,
    cupom_codigo: cupomAplicado ? cupomAplicado.codigo : '',
    cupom_desconto: cupomAplicado ? cupomAplicado.desconto : 0,
    itens: itensPedido
  };

  if (!pedido.cliente_nome || !pedido.cliente_telefone || !pedido.cliente_endereco) {
    alert('Preencha todos os campos obrigatórios!');
    return;
  }

  if (pagamentoSelecionado === 'cartao' && !cartaoTipo) {
    alert('Selecione o tipo de cartão (crédito, débito ou voucher)');
    return;
  }

  carrinho = [];
  atualizarCarrinho();

  fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pedido)
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.id) {
      fecharCheckout();
      document.getElementById('pedido-numero').textContent = 'Pedido #' + data.id;
      document.getElementById('pedido-link-rastreio').setAttribute('data-pedido', data.id);
      document.getElementById('pedido-confirmado-modal').style.display = 'flex';
      document.getElementById('checkout-form').reset();
      pagamentoSelecionado = null;
      document.querySelectorAll('.opcao-pagamento').forEach(function(el) { el.classList.remove('selecionado'); });
      document.getElementById('pix-info').style.display = 'none';
      document.getElementById('troco-area').style.display = 'none';
      document.getElementById('cartao-tipo-area').style.display = 'none';
      document.getElementById('troco-resultado').style.display = 'none';
    } else {
      alert('Erro: ' + (data.erro || 'Erro desconhecido'));
    }
  })
  .catch(function() { alert('Erro ao conectar com o servidor'); });
}

document.getElementById('input-troco').addEventListener('input', function() {
  var recebido = parseFloat(this.value.replace(',','.')) || 0;
  var total = calcularSubtotal() - (cupomAplicado ? cupomAplicado.desconto : 0);
  var el = document.getElementById('troco-resultado');
  if (pagamentoSelecionado === 'dinheiro' && recebido >= total) {
    el.style.display = 'block';
    el.textContent = 'Troco: R$ ' + (recebido - total).toFixed(2).replace('.',',');
  } else {
    el.style.display = 'none';
  }
});

document.addEventListener('DOMContentLoaded', carregarCardapio);

document.querySelectorAll('.modal').forEach(function(m) {
  m.addEventListener('click', function(e) {
    if (e.target === m) m.style.display = 'none';
  });
});
