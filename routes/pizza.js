const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.get('/config', (req, res) => {
  const configs = db.queryAll('SELECT pc.*, c.nome as categoria_nome FROM pizza_config pc JOIN categorias c ON c.id = pc.categoria_id');
  const resultado = configs.map(cfg => {
    const tamanhos = db.queryAll('SELECT * FROM pizza_tamanhos WHERE pizza_config_id = ? AND ativo = 1 ORDER BY ordem', [cfg.id]);
    const sabores = db.queryAll('SELECT * FROM pizza_sabores WHERE pizza_config_id = ? AND ativo = 1 ORDER BY ordem', [cfg.id]);
    const bordas = db.queryAll('SELECT * FROM pizza_bordas WHERE pizza_config_id = ? AND ativo = 1 ORDER BY ordem', [cfg.id]);
    return { ...cfg, tamanhos, sabores, bordas };
  });
  res.json(resultado);
});

router.get('/config/:categoriaId', (req, res) => {
  let cfg = db.queryOne('SELECT * FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  if (!cfg) return res.json({ ativo: false, tamanhos: [], sabores: [], bordas: [] });
  const tamanhos = db.queryAll('SELECT * FROM pizza_tamanhos WHERE pizza_config_id = ? AND ativo = 1 ORDER BY ordem', [cfg.id]);
  const sabores = db.queryAll('SELECT * FROM pizza_sabores WHERE pizza_config_id = ? AND ativo = 1 ORDER BY ordem', [cfg.id]);
  const bordas = db.queryAll('SELECT * FROM pizza_bordas WHERE pizza_config_id = ? AND ativo = 1 ORDER BY ordem', [cfg.id]);
  res.json({ ...cfg, tamanhos, sabores, bordas });
});

router.post('/config/:categoriaId', (req, res) => {
  const existente = db.queryOne('SELECT * FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  if (existente) return res.json(existente);
  const result = db.runSql('INSERT INTO pizza_config (categoria_id) VALUES (?)', [req.params.categoriaId]);
  const cfg = db.queryOne('SELECT * FROM pizza_config WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(cfg);
});

router.delete('/config/:categoriaId', (req, res) => {
  db.runSql('DELETE FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  res.json({ mensagem: 'Configuração de pizza removida' });
});

router.get('/tamanhos', (req, res) => {
  const tamanhos = db.queryAll('SELECT pt.*, pc.categoria_id FROM pizza_tamanhos pt JOIN pizza_config pc ON pc.id = pt.pizza_config_id ORDER BY pc.categoria_id, pt.ordem');
  res.json(tamanhos);
});

router.get('/config/:categoriaId/tamanhos', (req, res) => {
  const cfg = db.queryOne('SELECT * FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  if (!cfg) return res.json([]);
  const tamanhos = db.queryAll('SELECT * FROM pizza_tamanhos WHERE pizza_config_id = ? ORDER BY ordem', [cfg.id]);
  res.json(tamanhos);
});

router.post('/config/:categoriaId/tamanhos', (req, res) => {
  let cfg = db.queryOne('SELECT * FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  if (!cfg) {
    const r = db.runSql('INSERT INTO pizza_config (categoria_id) VALUES (?)', [req.params.categoriaId]);
    cfg = db.queryOne('SELECT * FROM pizza_config WHERE id = ?', [r.lastInsertRowid]);
  }
  const { nome, min_sabores, max_sabores, preco, ativo, ordem, foto } = req.body;
  if (!nome || preco === undefined) return res.status(400).json({ erro: 'Nome e preço são obrigatórios' });
  const fotoPath = salvarImagem(foto);
  const result = db.runSql('INSERT INTO pizza_tamanhos (pizza_config_id, nome, min_sabores, max_sabores, preco, ativo, ordem, foto) VALUES (?,?,?,?,?,?,?,?)',
    [cfg.id, nome, min_sabores || 1, max_sabores || 4, preco, ativo ?? 1, ordem || 0, fotoPath]);
  const tamanho = db.queryOne('SELECT * FROM pizza_tamanhos WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(tamanho);
});

router.put('/tamanhos/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM pizza_tamanhos WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Tamanho não encontrado' });
  const { nome, min_sabores, max_sabores, preco, ativo, ordem, foto } = req.body;
  let fotoPath = existing.foto;
  if (foto && foto.startsWith('data:image')) {
    if (existing.foto && existing.foto.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', 'public', existing.foto);
      try { fs.unlinkSync(oldPath); } catch(e) {}
    }
    fotoPath = salvarImagem(foto);
  }
  db.runSql('UPDATE pizza_tamanhos SET nome=?, min_sabores=?, max_sabores=?, preco=?, ativo=?, ordem=?, foto=? WHERE id=?',
    [nome ?? existing.nome, min_sabores ?? existing.min_sabores, max_sabores ?? existing.max_sabores, preco ?? existing.preco, ativo ?? existing.ativo, ordem ?? existing.ordem, fotoPath, req.params.id]);
  res.json(db.queryOne('SELECT * FROM pizza_tamanhos WHERE id = ?', [req.params.id]));
});

router.delete('/tamanhos/:id', (req, res) => {
  db.runSql('DELETE FROM pizza_tamanhos WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Tamanho removido' });
});

router.get('/config/:categoriaId/sabores', (req, res) => {
  const cfg = db.queryOne('SELECT * FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  if (!cfg) return res.json([]);
  const sabores = db.queryAll('SELECT * FROM pizza_sabores WHERE pizza_config_id = ? ORDER BY ordem', [cfg.id]);
  res.json(sabores);
});

router.post('/config/:categoriaId/sabores', (req, res) => {
  let cfg = db.queryOne('SELECT * FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  if (!cfg) {
    const r = db.runSql('INSERT INTO pizza_config (categoria_id) VALUES (?)', [req.params.categoriaId]);
    cfg = db.queryOne('SELECT * FROM pizza_config WHERE id = ?', [r.lastInsertRowid]);
  }
  const { nome, descricao, preco_adicional, ativo, ordem } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const result = db.runSql('INSERT INTO pizza_sabores (pizza_config_id, nome, descricao, preco_adicional, ativo, ordem) VALUES (?,?,?,?,?,?)',
    [cfg.id, nome, descricao || '', preco_adicional || 0, ativo ?? 1, ordem || 0]);
  const sabor = db.queryOne('SELECT * FROM pizza_sabores WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(sabor);
});

router.put('/sabores/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM pizza_sabores WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Sabor não encontrado' });
  const { nome, descricao, preco_adicional, ativo, ordem } = req.body;
  db.runSql('UPDATE pizza_sabores SET nome=?, descricao=?, preco_adicional=?, ativo=?, ordem=? WHERE id=?',
    [nome ?? existing.nome, descricao ?? existing.descricao, preco_adicional ?? existing.preco_adicional, ativo ?? existing.ativo, ordem ?? existing.ordem, req.params.id]);
  res.json(db.queryOne('SELECT * FROM pizza_sabores WHERE id = ?', [req.params.id]));
});

router.delete('/sabores/:id', (req, res) => {
  db.runSql('DELETE FROM pizza_sabores WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Sabor removido' });
});

router.get('/config/:categoriaId/bordas', (req, res) => {
  const cfg = db.queryOne('SELECT * FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  if (!cfg) return res.json([]);
  const bordas = db.queryAll('SELECT * FROM pizza_bordas WHERE pizza_config_id = ? ORDER BY ordem', [cfg.id]);
  res.json(bordas);
});

router.post('/config/:categoriaId/bordas', (req, res) => {
  let cfg = db.queryOne('SELECT * FROM pizza_config WHERE categoria_id = ?', [req.params.categoriaId]);
  if (!cfg) {
    const r = db.runSql('INSERT INTO pizza_config (categoria_id) VALUES (?)', [req.params.categoriaId]);
    cfg = db.queryOne('SELECT * FROM pizza_config WHERE id = ?', [r.lastInsertRowid]);
  }
  const { nome, preco, ativo, ordem } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  const result = db.runSql('INSERT INTO pizza_bordas (pizza_config_id, nome, preco, ativo, ordem) VALUES (?,?,?,?,?)',
    [cfg.id, nome, preco || 0, ativo ?? 1, ordem || 0]);
  const borda = db.queryOne('SELECT * FROM pizza_bordas WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(borda);
});

router.put('/bordas/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM pizza_bordas WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Borda não encontrada' });
  const { nome, preco, ativo, ordem } = req.body;
  db.runSql('UPDATE pizza_bordas SET nome=?, preco=?, ativo=?, ordem=? WHERE id=?',
    [nome ?? existing.nome, preco ?? existing.preco, ativo ?? existing.ativo, ordem ?? existing.ordem, req.params.id]);
  res.json(db.queryOne('SELECT * FROM pizza_bordas WHERE id = ?', [req.params.id]));
});

router.delete('/bordas/:id', (req, res) => {
  db.runSql('DELETE FROM pizza_bordas WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Borda removida' });
});

router.post('/calcular-preco', (req, res) => {
  const { tamanho_id, sabor_ids, borda_id } = req.body;
  const tamanho = db.queryOne('SELECT * FROM pizza_tamanhos WHERE id = ?', [tamanho_id]);
  if (!tamanho) return res.status(400).json({ erro: 'Tamanho inválido' });
  let total = tamanho.preco;
  if (sabor_ids && sabor_ids.length > 0) {
    const placeholders = sabor_ids.map(() => '?').join(',');
    const sabores = db.queryAll(`SELECT * FROM pizza_sabores WHERE id IN (${placeholders})`, sabor_ids);
    sabores.forEach(s => { total += s.preco_adicional || 0; });
  }
  if (borda_id) {
    const borda = db.queryOne('SELECT * FROM pizza_bordas WHERE id = ?', [borda_id]);
    if (borda) total += borda.preco;
  }
  res.json({ total });
});

module.exports = router;

function salvarImagem(base64) {
  if (!base64 || !base64.startsWith('data:image')) return '';
  const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) return '';
  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `tamanho_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}
