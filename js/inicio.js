/* =========================================================
   inicio.js — Página principal (FinControl)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  bindWalletToggle(); // [NUEVO]
  renderHome();
  window.addEventListener('storage', renderHome);
});

/**
 * [NUEVO] Interruptor "Incluir en el total" de la tarjeta de billetera.
 * Guarda la preferencia (se recuerda entre sesiones) y recalcula todo al instante.
 */
function bindWalletToggle() {
  document.getElementById('wallet-include-switch').addEventListener('click', () => {
    const current = getWalletSettings();
    setWalletSettings({ includeInTotal: !current.includeInTotal });
    renderHome();
  });
}

function renderHome() {
  const allAccounts = getAccounts();
  const accounts = allAccounts.filter((a) => a.status === 'active');
  const movements = getMovements();

  // [NUEVO] Configuración de la billetera y datos derivados
  const wallet = getWalletSettings();
  const walletCounted = isWalletCounted(wallet);
  const walletAccounts = accounts.filter((a) => a.type === 'wallet');
  const regularAccounts = accounts.filter((a) => a.type !== 'wallet');
  const walletTotal = sumWalletBalances(accounts);
  const walletIds = new Set(allAccounts.filter((a) => a.type === 'wallet').map((a) => a.id));
  const touchesWallet = (m) => walletIds.has(m.accountId) || walletIds.has(m.toAccountId);

  // ---- [MODIFICADO] Monto global: cuentas visibles + billetera (solo si visible e incluida) ----
  const total = computeGlobalTotal(accounts, wallet);
  document.getElementById('total-general').textContent = formatCurrency(total);
  document.getElementById('total-sub').textContent = walletCounted
    ? 'Suma de tus cuentas + billetera'
    : 'Suma de tus cuentas (sin billetera)';

  // ---- [NUEVO] Indicador de estado de la billetera en el monto total ----
  const indicator = document.getElementById('wallet-indicator');
  if (!wallet.visible) {
    indicator.textContent = '📱 Billetera oculta · no incluida en el total';
    indicator.className = 'wallet-indicator off';
  } else if (wallet.includeInTotal) {
    indicator.textContent = `📱 Billetera incluida en el total · ${formatCurrency(walletTotal)}`;
    indicator.className = 'wallet-indicator on';
  } else {
    indicator.textContent = `📱 Billetera excluida del total · ${formatCurrency(walletTotal)} por separado`;
    indicator.className = 'wallet-indicator off';
  }

  // ---- Mini totales ----
  const cash = sumByType(accounts, 'cash');
  const cards = sumByType(accounts, 'card');
  // [MODIFICADO] Entradas/salidas no suman movimientos de la billetera si esta no cuenta en el total
  const counted = movements.filter((m) => walletCounted || !touchesWallet(m));
  const incomes = sumMovements(counted.filter((m) => m.type === 'income'));
  const expenses = sumMovements(counted.filter((m) => m.type === 'expense'));

  document.getElementById('total-cards').textContent = formatCurrency(cards);
  document.getElementById('total-incomes').textContent = formatCurrency(incomes);
  document.getElementById('total-expenses').textContent = formatCurrency(expenses);

  // [MODIFICADO] "Efectivo" ahora es SOLO efectivo: la billetera tiene su propia tarjeta
  document.getElementById('total-cash').textContent = formatCurrency(cash);

  // ---- [NUEVO] Tarjeta de Billetera (oculta por completo si la billetera está oculta) ----
  const walletSection = document.getElementById('wallet-section');
  walletSection.hidden = !wallet.visible;
  if (wallet.visible) {
    document.getElementById('wallet-balance').textContent = formatCurrency(walletTotal);
    document.getElementById('wallet-detail').textContent = walletAccounts.length
      ? walletAccounts.map((a) => `${a.name}: ${formatCurrency(a.balance)}`).join(' · ')
      : 'Aún no tienes cuentas de tipo Billetera.';
    const sw = document.getElementById('wallet-include-switch');
    sw.classList.toggle('on', wallet.includeInTotal);
    sw.setAttribute('aria-checked', String(wallet.includeInTotal));
    document.getElementById('wallet-include-label').textContent =
      wallet.includeInTotal ? 'Incluida en el total' : 'Excluida del total';
  }

  // ---- Cuentas ----
  // [MODIFICADO] Las cuentas de tipo billetera se muestran en su propia tarjeta
  const accWrap = document.getElementById('home-accounts');
  const accEmpty = document.getElementById('home-accounts-empty');
  const hasAnythingToShow = regularAccounts.length > 0 || (wallet.visible && walletAccounts.length > 0);
  accWrap.innerHTML = regularAccounts.map(renderMiniAccount).join('');
  accEmpty.hidden = hasAnythingToShow;
  accWrap.hidden = regularAccounts.length === 0;

  // ---- Últimos movimientos ----
  // [MODIFICADO] Con la billetera oculta no se muestran sus movimientos en el panel
  const visibleMovements = wallet.visible ? movements : movements.filter((m) => !touchesWallet(m));
  const movWrap = document.getElementById('home-movements');
  const movEmpty = document.getElementById('home-movements-empty');
  movWrap.innerHTML = latestMovements(visibleMovements, 6)
    .map((m) => renderMovementRow(m, getAccounts(), {}))
    .join('');
  movEmpty.hidden = visibleMovements.length > 0;
  movWrap.hidden = visibleMovements.length === 0;
}
