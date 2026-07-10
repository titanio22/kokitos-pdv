const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const cupons = db.queryAll('SELECT * FROM cupons ORDER BY criado_em DESC');
  res.json(cupons);
});

router.post('/', (req, res) => {
  const { codigo, tipo, valor, tamanho_id, ativo } = req.body;
  if (!codigo) return res.status(400).json({ erro: 'Código é obrigatório' });
  const existente = db.queryOne('SELECT id FROM cupons WHERE codigo = ?', [codigo.toUpperCase()]);
  if (existente) return res.status(400).json({ erro: 'Este código já existe' });
  const result = db.runSql('INSERT INTO cupons (codigo, tipo, valor, tamanho_id, ativo) VALUES (?,?,?,?,?)',
    [codigo.toUpperCase(), tipo || 'percentual', valor || 0, tamanho_id || null, ativo ?? 1]);
  const cupom = db.queryOne('SELECT * FROM cupons WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(cupom);
});

router.put('/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM cupons WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Cupom não encontrado' });
  const { codigo, tipo, valor, tamanho_id, ativo } = req.body;
  db.runSql('UPDATE cupons SET codigo=?, tipo=?, valor=?, tamanho_id=?, ativo=? WHERE id=?',
    [(codigo || existing.codigo).toUpperCase(), tipo ?? existing.tipo, valor ?? existing.valor, tamanho_id !== undefined ? tamanho_id : existing.tamanho_id, ativo ?? existing.ativo, req.params.id]);
  res.json(db.queryOne('SELECT * FROM cupons WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM cupons WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Cupom não encontrado' });
  db.runSql('DELETE FROM cupons WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Cupom removido' });
});

router.post('/validar', (req, res) => {
  const { codigo, tamanho_id } = req.body;
  if (!codigo) return res.status(400).json({ erro: 'Código é obrigatório' });
  const cupom = db.queryOne('SELECT * FROM cupons WHERE codigo = ? AND ativo = 1', [codigo.toUpperCase()]);
  if (!cupom) return res.json({ valido: false, erro: 'Cupom inválido ou inativo' });
  if (cupom.tamanho_id && cupom.tamanho_id !== tamanho_id) {
    return res.json({ valido: false, erro: 'Cupom não se aplica a este tamanho' });
  }
  res.json({ valido: true, cupom });
});

module.exports = router;
