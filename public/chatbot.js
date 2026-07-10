function toggleChatbot() {
  const panel = document.getElementById('chatbot-panel');
  const btn = document.getElementById('chatbot-btn');
  if (panel.style.display === 'flex') {
    panel.style.display = 'none';
    btn.style.display = 'flex';
  } else {
    panel.style.display = 'flex';
    btn.style.display = 'none';
    if (document.querySelectorAll('.chatbot-mensagem').length === 0) {
      addMensagemChatbot('bot', "Olá! Bem-vindo(a) ao Kokito's Pizzaria! 🎉 Como posso ajudar?");
    }
  }
}

function addMensagemChatbot(tipo, texto) {
  const container = document.getElementById('chatbot-mensagens');
  const msg = document.createElement('div');
  msg.className = `chatbot-mensagem ${tipo}`;
  msg.textContent = texto;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function addMensagemChatbotHTML(tipo, html) {
  const container = document.getElementById('chatbot-mensagens');
  const msg = document.createElement('div');
  msg.className = `chatbot-mensagem ${tipo}`;
  msg.innerHTML = html;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function enviarChatbot() {
  const input = document.getElementById('chatbot-input');
  const texto = input.value.trim();
  if (!texto) return;

  addMensagemChatbot('user', texto);
  input.value = '';

  fetch('/api/chatbot/mensagem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensagem: texto })
  })
  .then(r => r.json())
  .then(data => {
    if (data.resposta) {
      addMensagemChatbot('bot', data.resposta);
    }
  })
  .catch(() => {
    addMensagemChatbot('bot', 'Desculpe, ocorreu um erro. Tente novamente!');
  });
}

if (document.getElementById('chatbot-btn')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (document.querySelectorAll('.chatbot-mensagem').length === 0) {
        addMensagemChatbot('bot', "Olá! Bem-vindo(a) ao Kokito's Pizzaria! 🎉 Como posso ajudar?");
      }
    }, 1000);
  });
}
