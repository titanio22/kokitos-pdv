if (sessionStorage.getItem('admin_logado') !== 'true') {
  window.location.href = 'index.html';
}

function toggleSidebar() {
  var s = document.getElementById('sidebar');
  s.classList.toggle('aberto');
  var b = document.getElementById('sidebar-backdrop');
  if (b) b.classList.toggle('aberto', s.classList.contains('aberto'));
}

const sidebar = document.getElementById('sidebar');
if (sidebar) {
  sidebar.className = 'admin-sidebar';
  const paginas = [
    { href: 'dashboard.html', icone: '📊', nome: 'Dashboard' },
    { href: 'pdv.html', icone: '🖥️', nome: 'PDV' },
    { href: 'pedidos.html', icone: '📋', nome: 'Pedidos' },
    { href: 'clientes.html', icone: '👥', nome: 'Clientes' },
    { href: 'pizza.html', icone: '🍕', nome: 'Pizzas' },
    { href: 'cupons.html', icone: '🏷️', nome: 'Cupons' },
    { href: 'configuracoes.html', icone: '⚙️', nome: 'Configurações' },
  ];
  const paginaAtual = window.location.pathname.split('/').pop();
  sidebar.innerHTML = `
    <h2>🍕 Kokito's</h2>
    <nav>
      ${paginas.map(p => `
        <a href="${p.href}" class="${paginaAtual === p.href ? 'ativo' : ''}" onclick="if(window.innerWidth<=480)document.getElementById('sidebar').classList.remove('aberto')">
          <span class="icone-sidebar">${p.icone}</span>
          <span class="nav-label">${p.nome}</span>
        </a>
      `).join('')}
      <a href="#" class="sair" onclick="sair()">
        <span class="icone-sidebar">🚪</span>
        <span class="nav-label">Sair</span>
      </a>
    </nav>
  `;
  document.body.insertAdjacentHTML('afterbegin', '<div class="sidebar-backdrop" id="sidebar-backdrop" onclick="toggleSidebar()"></div><button class="admin-toggle-sidebar" id="sidebar-toggle-btn" onclick="toggleSidebar()">☰</button>');
  window.addEventListener('resize', function() {
    if (window.innerWidth > 480) document.getElementById('sidebar').classList.remove('aberto');
  });
}

function sair() {
  sessionStorage.removeItem('admin_logado');
  window.location.href = 'index.html';
}
