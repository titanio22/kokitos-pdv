const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/pedidos/novos', (req, res) => {
  const ultimoId = parseInt(req.query.ultimo_id) || 0;
  const novos = db.queryAll('SELECT * FROM pedidos WHERE id > ? ORDER BY id', [ultimoId]);
  const dados = novos.map(p => {
    const itens = db.queryAll('SELECT * FROM pedido_itens WHERE pedido_id = ?', [p.id]);
    return { ...p, itens };
  });
  res.json(dados);
});

router.get('/pedidos/:id/impressao', (req, res) => {
  const pedido = db.queryOne('SELECT * FROM pedidos WHERE id = ?', [req.params.id]);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado' });
  const itens = db.queryAll('SELECT * FROM pedido_itens WHERE pedido_id = ?', [pedido.id]);
  const configs = db.queryAll('SELECT chave, valor FROM configuracoes');
  const cfg = {};
  configs.forEach(c => { cfg[c.chave] = c.valor; });

  const statusLabels = { novo: 'Novo', preparando: 'Preparando', saiu_entrega: 'Saiu p/ Entrega', entregue: 'Entregue', cancelado: 'Cancelado' };
  const statusLabel = statusLabels[pedido.status] || pedido.status;

  const formatMoeda = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

  const itensHtml = itens.map(i => {
    const sabores = db.queryAll('SELECT * FROM pedido_item_sabores WHERE pedido_item_id = ?', [i.id]);
    const saborHtml = sabores.length > 0 ? '<tr><td colspan="4" style="font-size:9px;color:#666;padding-left:36px">Sabores: ' + sabores.map(s => s.sabor_nome).join(', ') + '</td></tr>' : '';
    const bordaHtml = i.borda_nome && i.borda_preco > 0 ? '<tr><td colspan="4" style="font-size:9px;color:#666;padding-left:36px">Borda: ' + i.borda_nome + ' ' + formatMoeda(i.borda_preco) + '</td></tr>' : '';
    return `<tr><td style="text-align:center">${i.quantidade}x</td><td>${i.produto_nome}</td><td style="text-align:right">${formatMoeda(i.preco_unitario)}</td><td style="text-align:right">${formatMoeda(i.preco_unitario * i.quantidade)}</td></tr>${saborHtml}${bordaHtml}`;
  }).join('');

  const linha = '-'.repeat(42);
  const cabecalho = cfg.recibo_cabecalho || cfg.nome_empresa || 'DELIVERY';
  const rodape = cfg.recibo_rodape || 'Obrigado pela preferência!';
  const mostrarPreco = cfg.recibo_mostrar_preco !== '0';
  const mostrarEndereco = cfg.recibo_mostrar_endereco !== '0';
  const mostrarObs = cfg.recibo_mostrar_observacao !== '0';

  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Pedido #${pedido.id}</title>
<style>
  @page { margin: 0; size: ${cfg.recibo_largura === '58' ? '58mm' : '80mm'} auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; color: #000; width: ${cfg.recibo_largura === '58' ? '58mm' : '80mm'}; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .header { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 10px; margin-bottom: 2px; }
  .linha { border-top: 1px dashed #000; margin: 6px 0; }
  .linha-dupla { border-top: 3px double #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; padding: 2px 0; border-bottom: 1px solid #000; font-size: 10px; }
  td { padding: 2px 0; vertical-align: top; }
  .total-row td { font-weight: bold; font-size: 13px; padding-top: 4px; }
  .info { font-size: 10px; margin: 2px 0; }
  .footer { text-align: center; font-size: 10px; margin-top: 6px; }
  .status { text-align: center; font-size: 14px; font-weight: bold; margin: 6px 0; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <div class="header">${cabecalho}</div>
  <div class="sub">${cfg.endereco || ''}</div>
  <div class="sub">Tel: ${cfg.telefone || ''}</div>
  <div class="linha"></div>
  <div class="center"><span class="bold">PEDIDO #${pedido.id}</span></div>
  <div class="center" style="font-size:10px">${pedido.criado_em}</div>
  <div class="status">${statusLabel}</div>
  <div class="linha-dupla"></div>
  <table>
    <tr><th style="width:30px">Qtd</th><th>Item</th>${mostrarPreco ? '<th style="text-align:right">R$</th><th style="text-align:right">Sub</th>' : ''}</tr>
    ${mostrarPreco ? itensHtml : itens.map(i => `<tr><td style="text-align:center">${i.quantidade}x</td><td colspan="3">${i.produto_nome}</td></tr>`).join('')}
  </table>
  <div class="linha"></div>
  <table>
    <tr class="total-row"><td colspan="${mostrarPreco ? '3' : '1'}"></td><td style="text-align:right">Total: ${formatMoeda(pedido.total)}</td></tr>
  </table>
  <div class="linha-dupla"></div>
  <div class="info"><span class="bold">Cliente:</span> ${pedido.cliente_nome}</div>
  <div class="info"><span class="bold">Tel:</span> ${pedido.cliente_telefone}</div>
  ${pedido.cupom_codigo ? `<div class="info"><span class="bold">Cupom:</span> ${pedido.cupom_codigo} (-${formatMoeda(pedido.cupom_desconto)})</div>` : ''}
  ${mostrarEndereco ? `<div class="info"><span class="bold">Endereço:</span> ${pedido.cliente_endereco}</div>` : ''}
  ${mostrarObs && pedido.cliente_observacao ? `<div class="info"><span class="bold">Obs:</span> ${pedido.cliente_observacao}</div>` : ''}
  <div class="linha"></div>
  <div class="footer">${rodape}</div>
  <div class="footer" style="margin-top:2px;font-size:9px">Obrigado pela preferência!</div>
  <div class="no-print" style="text-align:center;margin-top:10px">
    <button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer">🖨️ IMPRIMIR</button>
    <button onclick="window.close()" style="padding:10px 30px;font-size:16px;cursor:pointer;margin-left:10px">✖ FECHAR</button>
  </div>
  <script>if (!location.search.includes('silent=1')) { window.onload = function() { setTimeout(function() { window.print(); }, 500); }; }</script>
</body></html>`);
});

module.exports = router;
