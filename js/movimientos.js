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

/** Rellena el filtro de cuentas preservando la opción "Todas" y la selección actual */
function refreshAccountFilter() {
  const sel = document.getElementById('filter-account');
  const prev = sel.value || 'all';
  sel.innerHTML =
    '<option value="all">Todas las cuentas</option>' +
    getAccounts()
      .filter((a) => a.status === 'active')
      .map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`)
      .join('');
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function getFilteredMovements() {
  const type = document.getElementById('filter-type').value;
  const account = document.getElementById('filter-account').value;
  const sort = document.getElementById('filter-sort').value;

  let list = [...getMovements()];

  if (type !== 'all') list = list.filter((m) => m.type === type);
  if (account !== 'all') list = list.filter((m) => m.accountId === account);

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
  document.getElementById('mov-summary').innerHTML =
    `<span>⬆️ ${formatCurrency(incomes)}</span>&nbsp;&nbsp;<span>⬇️ ${formatCurrency(expenses)}</span>`;

  // Agrupar por día
  const groups = groupByDate(list);
  if (!groups.length) {
    wrap.innerHTML = '';
  } else {
    wrap.innerHTML = groups
      .map((g) => `
        <div class="mov-group-date">${formatDate(g.date)}</div>
        <div class="mov-card">${g.items
          .map((m) => renderMovementRow(m, accounts, { onDelete: true }))
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
