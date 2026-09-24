/* =========================================================
   theme.js — Modo claro / oscuro (FinControl)
   Guarda la preferencia vía la capa de almacenamiento.
   ========================================================= */

/** Aplica el tema al documento y actualiza el icono del botón */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setTheme(theme); // persistir vía storage.js
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    const icon = btn.querySelector('.theme-icon');
    const label = btn.querySelector('.theme-label');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (label) label.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
    if (btn.classList.contains('switch-btn')) btn.classList.toggle('on', theme === 'dark');
  });
}

/** Alterna claro/oscuro */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/** Inicializa el tema al cargar la página */
function initTheme() {
  const saved = getTheme();
  applyTheme(saved === 'dark' ? 'dark' : 'light');
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', toggleTheme);
  });
}

document.addEventListener('DOMContentLoaded', initTheme);
