/* =========================================================
   inicio.js — Página principal (FinControl)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  renderHome();
  window.addEventListener('storage', renderHome);
});

function renderHome() {
  const accounts = getAccounts().filter((a) => a.status === 'active');
  const movements = getMovements();

  // ---- Total general (suma de saldos activos) ----
  const total = sumAccountBalances(accounts);
  document.getElementById('total-general').textContent = formatCurrency(total);

  // ---- Mini totales ----
  const cash = sumByType(accounts, 'cash');
  const cards = sumByType(accounts, 'card');
  const wallets = sumByType(accounts, 'wallet');
  const incomes = sumMovements(movements.filter((m) => m.type === 'income'));
  const expenses = sumMovements(movements.filter((m) => m.type === 'expense'));

  document.getElementById('total-cards').textContent = formatCurrency(cards);
  document.getElementById('total-incomes').textContent = formatCurrency(incomes);
  document.getElementById('total-expenses').textContent = formatCurrency(expenses);

  // "Efectivo" del resumen = efectivo + billeteras (Yape/Plin)
  document.getElementById('total-cash').textContent = formatCurrency(cash + wallets);

  // ---- Cuentas ----
  const accWrap = document.getElementById('home-accounts');
  const accEmpty = document.getElementById('home-accounts-empty');
  accWrap.innerHTML = accounts.map(renderMiniAccount).join('');
  accEmpty.hidden = accounts.length > 0;
  accWrap.hidden = accounts.length === 0;

  // ---- Últimos movimientos ----
  const movWrap = document.getElementById('home-movements');
  const movEmpty = document.getElementById('home-movements-empty');
  movWrap.innerHTML = latestMovements(movements, 6)
    .map((m) => renderMovementRow(m, getAccounts(), {}))
    .join('');
  movEmpty.hidden = movements.length > 0;
  movWrap.hidden = movements.length === 0;
}
