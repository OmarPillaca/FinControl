/* =========================================================
   nav.js — Navegación lateral / inferior (FinControl)
   Desktop: menú lateral fijo. Móvil: barra inferior.
   ========================================================= */

const NAV_ITEMS = [
  { href: 'index.html',       icon: '🏠', label: 'Inicio' },
  { href: 'cuentas.html',     icon: '🏦', label: 'Cuentas' },
  { href: 'entradas.html',    icon: '⬆️', label: 'Entradas' },
  { href: 'salidas.html',     icon: '⬇️', label: 'Salidas' },
  { href: 'movimientos.html', icon: '📋', label: 'Movimientos' },
  { href: 'papelera.html',    icon: '🗑️', label: 'Papelera' },
  { href: 'configuracion.html', icon: '⚙️', label: 'Configuración' },
];

/** Resalta el enlace activo comparando el nombre de archivo actual */
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const target = a.getAttribute('href');
    a.classList.toggle('active', target === page);
    if (a.classList.contains('active')) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/** Construye el menú lateral (desktop) y la barra inferior (móvil) */
function buildNav() {
  const sidebar = document.getElementById('sidebar-nav');
  const bottom = document.getElementById('bottom-nav');
  const current = location.pathname.split('/').pop() || 'index.html';

  if (sidebar) {
    sidebar.innerHTML = NAV_ITEMS.map((item) => `
      <a href="${item.href}" data-nav class="nav-link ${item.href === current ? 'active' : ''}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>
    `).join('');
  }

  if (bottom) {
    bottom.innerHTML = NAV_ITEMS.map((item) => `
      <a href="${item.href}" data-nav class="bottom-link ${item.href === current ? 'active' : ''}">
        <span class="nav-icon">${item.icon}</span>
        <span class="bottom-label">${item.label}</span>
      </a>
    `).join('');
  }

  setActiveNav();
}

document.addEventListener('DOMContentLoaded', buildNav);
