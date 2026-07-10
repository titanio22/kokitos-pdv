const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  const configs = db.queryAll('SELECT * FROM configuracoes ORDER BY id');
  res.json(configs);
});

router.put('/:chave', (req, res) => {
  const { valor } = req.body;
  if (valor === undefined) return res.status(400).json({ erro: 'Valor é obrigatório' });
  const existing = db.queryOne('SELECT * FROM configuracoes WHERE chave = ?', [req.params.chave]);
  if (!existing) return res.status(404).json({ erro: 'Configuração não encontrada' });
  db.runSql('UPDATE configuracoes SET valor = ? WHERE chave = ?', [valor, req.params.chave]);
  const config = db.queryOne('SELECT * FROM configuracoes WHERE chave = ?', [req.params.chave]);
  res.json(config);
});

router.put('/', (req, res) => {
  const configs = req.body;
  if (!configs || typeof configs !== 'object') return res.status(400).json({ erro: 'Envie um objeto com chave: valor' });
  for (const [chave, valor] of Object.entries(configs)) {
    db.runSql('UPDATE configuracoes SET valor = ? WHERE chave = ?', [String(valor), chave]);
  }
  const todas = db.queryAll('SELECT * FROM configuracoes ORDER BY id');
  res.json(todas);
});

module.exports = router;
