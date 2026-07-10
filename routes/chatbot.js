const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/respostas', (req, res) => {
  const respostas = db.queryAll('SELECT * FROM chatbot_respostas ORDER BY prioridade DESC');
  res.json(respostas);
});

router.post('/respostas', (req, res) => {
  const { palavras_chave, resposta, prioridade, ativo } = req.body;
  if (!palavras_chave || !resposta) return res.status(400).json({ erro: 'Palavras-chave e resposta são obrigatórios' });
  const result = db.runSql('INSERT INTO chatbot_respostas (palavras_chave, resposta, prioridade, ativo) VALUES (?, ?, ?, ?)',
    [palavras_chave, resposta, prioridade || 0, ativo ?? 1]
  );
  const nova = db.queryOne('SELECT * FROM chatbot_respostas WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(nova);
});

router.put('/respostas/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM chatbot_respostas WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Resposta não encontrada' });
  const { palavras_chave, resposta, prioridade, ativo } = req.body;
  db.runSql('UPDATE chatbot_respostas SET palavras_chave = ?, resposta = ?, prioridade = ?, ativo = ? WHERE id = ?',
    [palavras_chave ?? existing.palavras_chave, resposta ?? existing.resposta, prioridade ?? existing.prioridade, ativo ?? existing.ativo, req.params.id]
  );
  const atualizada = db.queryOne('SELECT * FROM chatbot_respostas WHERE id = ?', [req.params.id]);
  res.json(atualizada);
});

router.delete('/respostas/:id', (req, res) => {
  const existing = db.queryOne('SELECT * FROM chatbot_respostas WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ erro: 'Resposta não encontrada' });
  db.runSql('DELETE FROM chatbot_respostas WHERE id = ?', [req.params.id]);
  res.json({ mensagem: 'Resposta removida com sucesso' });
});

router.post('/mensagem', (req, res) => {
  const { mensagem } = req.body;
  if (!mensagem) return res.status(400).json({ erro: 'Mensagem é obrigatória' });

  const msgLower = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const respostas = db.queryAll('SELECT * FROM chatbot_respostas WHERE ativo = 1 ORDER BY prioridade DESC');
  const configuracoes = db.queryAll('SELECT chave, valor FROM configuracoes');
  const configMap = {};
  configuracoes.forEach(c => { configMap[c.chave] = c.valor; });

  let melhorResposta = null;
  let melhorPontuacao = 0;

  for (const r of respostas) {
    const palavras = r.palavras_chave.split(',').map(p => p.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    let pontuacao = 0;
    for (const palavra of palavras) {
      if (msgLower.includes(palavra)) {
        pontuacao++;
      }
    }
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorResposta = r.resposta;
    }
  }

  if (!melhorResposta) {
    return res.json({ resposta: 'Desculpe, não entendi. Pode perguntar de outra forma? Pergunte sobre cardápio, horários, entregas ou contato!' });
  }

  let respostaFinal = melhorResposta;
  for (const [chave, valor] of Object.entries(configMap)) {
    respostaFinal = respostaFinal.replace(new RegExp(`@${chave}`, 'g'), valor);
  }
  respostaFinal = respostaFinal.replace(/@(\w+)_texto/g, (match, chave) => {
    const v = configMap[chave];
    if (v === '1') return 'sim';
    if (v === '0') return 'não';
    return v || match;
  });

  res.json({ resposta: respostaFinal });
});

module.exports = router;
