const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { status } = req.query;
  let pedidos;
  if (status) {
    pedidos = db.queryAll('SELECT * FROM pedidos WHERE status = ? ORDER BY criado_em DESC', [status]);
  } else {
    pedidos = db.queryAll('SELECT * FROM pedidos ORDER BY criado_em DESC');
  }
  const pedidosComItens = pedidos.map(p => {
    const itens = db.queryAll('SELECT * FROM pedido_itens WHERE pedido_id = ?', [p.id]);
    return { ...p, itens };
  });
  res.json(pedidosComItens);
});

router.get('/:id', (req, res) => {
  const pedido = db.queryOne('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const itens = db.queryAll('SELECT * FROM pedido_itens WHERE pedido_id = ?', [pedido.id]);
  res.json({ ...pedido, itens });
});

router.post('/', (req, res) => {
  const { cliente_id, cliente_nome, cliente_telefone, cliente_endereco, cliente_observacao, pagamento, troco_para, cartao_tipo, ponto_referencia, endereco_confirmado, cupom_codigo, cupom_desconto, itens } = req.body;
  if (!cliente_nome || !cliente_telefone || !cliente_endereco || !itens || !itens.length) {
    return res.status(400).json({ erro: 'Nome, telefone, endereço e itens são obrigatórios' });
  }

  let total = 0;
  const itensParaInserir = itens.map(item => {
    const produto = item.produto_id ? db.queryOne('SELECT * FROM produtos WHERE id = ?', [item.produto_id]) : null;
    const preco = item.preco_unitario || (produto ? produto.preco : 0);
    const qtd = item.quantidade || 1;
    total += preco * qtd;
    return {
      produto_id: item.produto_id,
      produto_nome: item.produto_nome || (produto ? produto.nome : 'Item'),
      quantidade: qtd,
      preco_unitario: preco,
      pizza_info: item.pizza_info || null,

    };
  });

  const result = db.runSql('INSERT INTO pedidos (cliente_id, cliente_nome, cliente_telefone, cliente_endereco, cliente_observacao, pagamento, troco_para, cartao_tipo, ponto_referencia, endereco_confirmado, cupom_codigo, cupom_desconto, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [cliente_id || null, cliente_nome, cliente_telefone, cliente_endereco, cliente_observacao || '', pagamento || '', troco_para || 0, cartao_tipo || '', ponto_referencia || '', endereco_confirmado || 0, cupom_codigo || '', cupom_desconto || 0, total]
  );
  const pedidoId = result.lastInsertRowid;
  for (const item of itensParaInserir) {
    const bordaId = (item.pizza_info && item.pizza_info.borda) ? item.pizza_info.borda.id : null;
    const bordaNome = (item.pizza_info && item.pizza_info.borda) ? item.pizza_info.borda.nome : '';
    const bordaPreco = (item.pizza_info && item.pizza_info.borda) ? (item.pizza_info.borda.preco || 0) : 0;
    const result = db.runSql('INSERT INTO pedido_itens (pedido_id, produto_id, produto_nome, quantidade, preco_unitario, borda_id, borda_nome, borda_preco) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [pedidoId, item.produto_id, item.produto_nome, item.quantidade, item.preco_unitario, bordaId, bordaNome, bordaPreco]
    );
    if (item.pizza_info && item.pizza_info.sabores) {
      for (const sabor of item.pizza_info.sabores) {
        db.runSql('INSERT INTO pedido_item_sabores (pedido_item_id, sabor_id, sabor_nome) VALUES (?, ?, ?)',
          [result.lastInsertRowid, sabor.id, sabor.nome]
        );
      }
    }
  }

  const pedido = db.queryOne('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
  const itensInseridos = db.queryAll('SELECT * FROM pedido_itens WHERE pedido_id = ?', [pedidoId]);
  const itensComSabores = itensInseridos.map(i => {
    const sabores = db.queryAll('SELECT * FROM pedido_item_sabores WHERE pedido_item_id = ?', [i.id]);
    return { ...i, sabores };
  });
  res.status(201).json({ ...pedido, itens: itensComSabores });
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  const statusValidos = ['novo', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'];
  if (!statusValidos.includes(status)) return res.status(400).json({ erro: 'Status inválido' });
  const existing = db.queryOne('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Pedido não encontrado' });
  db.runSql("UPDATE pedidos SET status = ?, atualizado_em = datetime('now','localtime') WHERE id = ?", [status, req.params.id]);
  const pedido = db.queryOne('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
  res.json(pedido);
});

router.put('/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const { cliente_nome, cliente_telefone, cliente_endereco, cliente_observacao, status } = req.body;
  db.runSql(`UPDATE pedidos SET cliente_nome = ?, cliente_telefone = ?, cliente_endereco = ?, cliente_observacao = ?, status = ?, atualizado_em = datetime('now','localtime') WHERE id = ?`,
    [cliente_nome ?? existing.cliente_nome, cliente_telefone ?? existing.cliente_telefone, cliente_endereco ?? existing.cliente_endereco, cliente_observacao ?? existing.cliente_observacao, status ?? existing.status, req.params.id]
  );
  const pedido = db.queryOne('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
  res.json(pedido);
});

router.get('/cliente/:clienteId', (req, res) => {
  const pedidos = db.queryAll('SELECT * FROM pedidos WHERE cliente_id = ? ORDER BY criado_em DESC', [req.params.clienteId]);
  const resultado = pedidos.map(p => {
    const itens = db.queryAll('SELECT * FROM pedido_itens WHERE pedido_id = ?', [p.id]);
    return { ...p, itens };
  });
  res.json(resultado);
});

router.get('/rastreio/:telefone', (req, res) => {
  const tel = req.params.telefone.replace(/\D/g, '');
  const pedidos = db.queryAll('SELECT * FROM pedidos ORDER BY criado_em DESC');
  const filtrados = pedidos.filter(p => {
    const fone = (p.cliente_telefone || '').replace(/\D/g, '');
    return fone.includes(tel);
  });
  const resultado = filtrados.map(p => {
    const itens = db.queryAll('SELECT * FROM pedido_itens WHERE pedido_id = ?', [p.id]);
    return { ...p, itens };
  });
  res.json(resultado);
});

router.delete('/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const itens = db.queryAll('SELECT id FROM pedido_itens WHERE pedido_id = ?', [req.params.id]);
  for (const item of itens) {
    db.runSql('DELETE FROM pedido_item_sabores WHERE pedido_item_id = ?', [item.id]);
  }
  db.runSql('DELETE FROM pedido_itens WHERE pedido_id = ?', [req.params.id]);
  db.runSql('DELETE FROM pedidos WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Pedido removido com sucesso' });
});

module.exports = router;
