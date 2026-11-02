/* =========================================================
   movimientos.js — Historial de movimientos (FinControl)
   ========================================================= */

const showModal = setupConfirmModal();

document.addEventListener('DOMContentLoaded', () => {
  refreshAccountFilter();
  bindFilters();
  renderMovements();
  window.addEventListener('storage', () => {
    refreshAccountFilter();
    renderMovements();
  });
});

function bindFilters() {
  ['filter-type', 'filter-account', 'filter-sort'].forEach((id) => {
    document.getElementById(id).addEventListener('change', renderMovements);
  });
}

/**
 * Rellena el filtro de cuentas preservando la selección actual.
 * [MODIFICADO] Opciones: todas las cuentas (incluye billetera, vista
 * predeterminada) · solo billetera · una cuenta específica.
 */
function refreshAccountFilter() {
  const sel = document.getElementById('filter-account');
  const prev = sel.value || 'all';
  sel.innerHTML =
    '<option value="all">Todas las cuentas (incluye billetera)</option>' +
    '<option value="wallet">📱 Solo billetera</option>' +
    getAccounts()
      .map((a) => `<option value="${a.id}">${getAccountType(a.type).icon} ${escapeHtml(a.name)}${a.status === 'active' ? '' : ' (inactiva)'}</option>`)
      .join('');
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

/** [NUEVO] IDs de las cuentas de tipo billetera */
function getWalletAccountIds() {
  return getAccounts().filter((a) => a.type === 'wallet').map((a) => a.id);
}

/**
 * [NUEVO] IDs de cuenta que definen la "perspectiva" del filtro actual.
 * Sirve para mostrar las transferencias como + (entra) o − (sale).
 */
function getFilterAccountIds() {
  const account = document.getElementById('filter-account').value;
  if (account === 'all') return [];
  if (account === 'wallet') return getWalletAccountIds();
  return [account];
}

function getFilteredMovements() {
  const type = document.getElementById('filter-type').value;
  const sort = document.getElementById('filter-sort').value;
  const ids = getFilterAccountIds();

  let list = [...getMovements()];

  if (type !== 'all') list = list.filter((m) => m.type === type);
  // [MODIFICADO] una transferencia aparece en la cuenta de origen Y en la de destino
  if (ids.length || document.getElementById('filter-account').value === 'wallet') {
    list = list.filter((m) => ids.includes(m.accountId) || ids.includes(m.toAccountId));
  }

  list.sort((a, b) => (sort === 'asc' ? a.date - b.date : b.date - a.date));
  return list;
}

function renderMovements() {
  const accounts = getAccounts();
  const list = getFilteredMovements();
  const wrap = document.getElementById('movements-list');
  const empty = document.getElementById('movements-empty');

  // Resumen del filtro actual
  const incomes = sumMovements(list.filter((m) => m.type === 'income'));
  const expenses = sumMovements(list.filter((m) => m.type === 'expense'));
  const transfers = sumMovements(list.filter((m) => m.type === 'transfer')); // [NUEVO]
  document.getElementById('mov-summary').innerHTML =
    `<span>⬆️ ${formatCurrency(incomes)}</span>&nbsp;&nbsp;<span>⬇️ ${formatCurrency(expenses)}</span>&nbsp;&nbsp;<span>🔄 ${formatCurrency(transfers)}</span>`;

  // Agrupar por día
  const perspective = getFilterAccountIds(); // [NUEVO] signo de transferencias según la cuenta filtrada
  const groups = groupByDate(list);
  if (!groups.length) {
    wrap.innerHTML = '';
  } else {
    wrap.innerHTML = groups
      .map((g) => `
        <div class="mov-group-date">${formatDate(g.date)}</div>
        <div class="mov-card">${g.items
          .map((m) => renderMovementRow(m, accounts, { onDelete: true, perspective }))
          .join('')}</div>`)
      .join('');
  }
  empty.hidden = list.length > 0;

  // Eliminar → papelera
  wrap.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.del;
      showModal({
        title: 'Eliminar movimiento',
        text: 'El movimiento se enviará a la papelera y el saldo de la cuenta se ajustará automáticamente.',
        okLabel: 'Enviar a la papelera',
        onConfirm: () => {
          sendToTrash('movement', id);
          refreshAccountFilter();
          renderMovements();
        },
      });
    });
  });
}
