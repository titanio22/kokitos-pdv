const express = require('express');
const router = express.Router();
const db = require('../database');

router.post('/register', (req, res) => {
  const { login, senha, nome, telefone, endereco, ponto_referencia } = req.body;
  if (!login || !senha || !nome || !telefone || !endereco) {
    return res.status(400).json({ erro: 'Login, senha, nome, telefone e endereço são obrigatórios' });
  }
  const existente = db.queryOne('SELECT id FROM clientes WHERE login = ?', [login]);
  if (existente) return res.status(400).json({ erro: 'Este login já está em uso' });
  const result = db.runSql('INSERT INTO clientes (login, senha, nome, telefone, endereco, ponto_referencia) VALUES (?,?,?,?,?,?)',
    [login, senha, nome, telefone, endereco, ponto_referencia || '']);
  const cliente = db.queryOne('SELECT id, login, nome, telefone, endereco, ponto_referencia FROM clientes WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(cliente);
});

router.post('/login', (req, res) => {
  const { login, senha } = req.body;
  if (!login || !senha) return res.status(400).json({ erro: 'Login e senha são obrigatórios' });
  const cliente = db.queryOne('SELECT id, login, nome, telefone, endereco, ponto_referencia FROM clientes WHERE login = ? AND senha = ? AND ativo = 1', [login, senha]);
  if (!cliente) return res.status(401).json({ erro: 'Login ou senha inválidos' });
  res.json(cliente);
});

router.get('/', (req, res) => {
  const clientes = db.queryAll('SELECT id, login, nome, telefone, endereco, ponto_referencia, criado_em, ativo FROM clientes ORDER BY criado_em DESC');
  res.json(clientes);
});

router.delete('/:id', (req, res) => {
  const existing = db.queryOne('SELECT id FROM clientes WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Cliente não encontrado' });
  db.runSql('DELETE FROM clientes WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Cliente removido com sucesso' });
});

module.exports = router;
