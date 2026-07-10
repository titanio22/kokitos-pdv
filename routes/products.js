const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const { categoria_id } = req.query;
  let produtos;
  if (categoria_id) {
    produtos = db.queryAll('SELECT * FROM produtos WHERE categoria_id = ? ORDER BY ordem', [categoria_id]);
  } else {
    produtos = db.queryAll('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id ORDER BY p.categoria_id, p.ordem');
  }
  res.json(produtos);
});

router.get('/:id', (req, res) => {
  const produto = db.queryOne('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?', [req.params.id]);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.json(produto);
});

router.post('/', (req, res) => {
  const { categoria_id, nome, descricao, preco, imagem, ativo, ordem } = req.body;
  if (!nome || !categoria_id || preco === undefined) return res.status(400).json({ erro: 'Nome, categoria e preço são obrigatórios' });
  const result = db.runSql('INSERT INTO produtos (categoria_id, nome, descricao, preco, imagem, ativo, ordem) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [categoria_id, nome, descricao || '', preco, imagem || '', ativo ?? 1, ordem || 0]
  );
  const produto = db.queryOne('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?', [result.lastInsertRowid]);
  res.status(201).json(produto);
});

router.put('/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Produto não encontrado' });
  const { categoria_id, nome, descricao, preco, imagem, ativo, ordem } = req.body;
  db.runSql(`UPDATE produtos SET categoria_id = ?, nome = ?, descricao = ?, preco = ?, imagem = ?, ativo = ?, ordem = ?, atualizado_em = datetime('now','localtime') WHERE id = ?`,
    [categoria_id ?? existing.categoria_id, nome ?? existing.nome, descricao ?? existing.descricao, preco ?? existing.preco, imagem ?? existing.imagem, ativo ?? existing.ativo, ordem ?? existing.ordem, req.params.id]
  );
  const produto = db.queryOne('SELECT p.*, c.nome as categoria_nome FROM produtos p LEFT JOIN categorias c ON p.categoria_id = c.id WHERE p.id = ?', [req.params.id]);
  res.json(produto);
});

router.delete('/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Produto não encontrado' });
  db.runSql('DELETE FROM produtos WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Produto removido com sucesso' });
});

module.exports = router;
