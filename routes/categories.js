const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const categorias = db.queryAll(`
    SELECT c.*, CASE WHEN pc.id IS NOT NULL THEN 'pizza' ELSE 'normal' END as tipo, COALESCE(pc.id, 0) as pizza_config_id
    FROM categorias c
    LEFT JOIN pizza_config pc ON pc.categoria_id = c.id AND pc.ativo = 1
    ORDER BY c.ordem
  `);
  res.json(categorias);
});

router.get('/:id', (req, res) => {
  const categoria = db.queryOne('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada' });
  res.json(categoria);
});

router.post('/', (req, res) => {
  const { nome, descricao, icone, ativo, ordem } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const result = db.runSql('INSERT INTO categorias (nome, descricao, icone, ativo, ordem) VALUES (?, ?, ?, ?, ?)',
    [nome, descricao || '', icone || '', ativo ?? 1, ordem || 0]
  );
  const categoria = db.queryOne('SELECT * FROM categorias WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(categoria);
});

router.put('/:id', (req, res) => {
  const { nome, descricao, icone, ativo, ordem } = req.body;
  const existing = db.queryOne('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Categoria não encontrada' });
  db.runSql(`UPDATE categorias SET nome = ?, descricao = ?, icone = ?, ativo = ?, ordem = ?, atualizado_em = datetime('now','localtime') WHERE id = ?`,
    [nome ?? existing.nome, descricao ?? existing.descricao, icone ?? existing.icone, ativo ?? existing.ativo, ordem ?? existing.ordem, req.params.id]
  );
  const categoria = db.queryOne('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  res.json(categoria);
});

router.delete('/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Categoria não encontrada' });
  db.runSql('DELETE FROM categorias WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Categoria removida com sucesso' });
});

module.exports = router;
