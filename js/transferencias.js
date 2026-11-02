/* =========================================================
   transferencias.js — Transferencias entre cuentas (FinControl)
   [NUEVO] Formulario de la página "Cuentas". Resta del origen y
   suma al destino (storage.js → createTransfer) y deja la
   transferencia registrada en el historial de movimientos.
   Se carga DESPUÉS de cuentas.js (usa renderAccounts()).
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tr-date').value = todayIso();
  bindTransferForm();
});

/**
 * Refresca selectores, saldos mostrados y últimas transferencias.
 * La llama renderAccounts() (cuentas.js) cada vez que cambian las cuentas.
 */
function refreshTransferUI() {
  const accounts = getAccounts();
  populateAccountSelect(document.getElementById('tr-from'), accounts);
  populateAccountSelect(document.getElementById('tr-to'), accounts);
  updateTransferHints();
  renderRecentTransfers();
}

/** Muestra el saldo actual bajo cada selector */
function updateTransferHints() {
  [['tr-from', 'hint-tr-from'], ['tr-to', 'hint-tr-to']].forEach(([selId, hintId]) => {
    const acc = getAccountById(document.getElementById(selId).value);
    document.getElementById(hintId).textContent = acc ? `Saldo actual: ${formatCurrency(acc.balance)}` : '';
  });
}

function renderRecentTransfers() {
  const accounts = getAccounts();
  const transfers = getMovements()
    .filter((m) => m.type === 'transfer')
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  const wrap = document.getElementById('transfer-recent');
  wrap.innerHTML = transfers.length
    ? `<div class="mov-card">${transfers.map((m) => renderMovementRow(m, accounts, {})).join('')}</div>`
    : '';
  document.getElementById('transfer-recent-empty').hidden = transfers.length > 0;
}

function trToggle(errId, inputId, show) {
  document.getElementById(errId).classList.toggle('visible', show);
  document.getElementById(inputId).classList.toggle('invalid', show);
}

function bindTransferForm() {
  const form = document.getElementById('transfer-form');

  ['tr-from', 'tr-to'].forEach((id) =>
    document.getElementById(id).addEventListener('change', updateTransferHints)
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fromId = document.getElementById('tr-from').value;
    const toId = document.getElementById('tr-to').value;
    const amount = parseAmount(document.getElementById('tr-amount').value);
    const dateInput = document.getElementById('tr-date').value;
    const description = document.getElementById('tr-desc').value.trim();

    // ---- Validaciones ----
    ['tr-from', 'tr-to', 'tr-amount', 'tr-date'].forEach((id) => trToggle('err-' + id, id, false));
    document.getElementById('err-tr-to').textContent = 'Selecciona la cuenta de destino.';

    let valid = true;
    if (!fromId) { trToggle('err-tr-from', 'tr-from', true); valid = false; }
    if (!toId) { trToggle('err-tr-to', 'tr-to', true); valid = false; }
    if (fromId && toId && fromId === toId) {
      document.getElementById('err-tr-to').textContent = 'El destino debe ser distinto al origen.';
      trToggle('err-tr-to', 'tr-to', true);
      valid = false;
    }
    if (!isValidAmount(amount)) { trToggle('err-tr-amount', 'tr-amount', true); valid = false; }
    if (!dateInput) { trToggle('err-tr-date', 'tr-date', true); valid = false; }
    if (!valid) return;

    // Registrar vía capa de almacenamiento (actualiza ambos saldos)
    const result = createTransfer({
      fromId,
      toId,
      amount,
      description,
      date: timestampFromDateInput(dateInput),
    });

    if (!result.ok) {
      showAlert('transfer-alert', result.error);
      return;
    }

    form.reset();
    document.getElementById('tr-date').value = todayIso();
    renderAccounts(); // refresca saldos de las tarjetas, selectores y últimas transferencias
    showAlert('transfer-success', '✅ Transferencia realizada. Saldos actualizados.', 'success');
  });

  // Limpiar error al corregir
  ['tr-from', 'tr-to', 'tr-amount', 'tr-date'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => trToggle('err-' + id, id, false));
  });
}
