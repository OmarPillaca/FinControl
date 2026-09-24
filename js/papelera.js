/* =========================================================
   papelera.js — Papelera de elementos eliminados (FinControl)
   ========================================================= */

const showModal = setupConfirmModal();

document.addEventListener('DOMContentLoaded', () => {
  renderTrash();
  bindEmptyTrash();
});

function renderTrash() {
  const trash = getTrash().sort((a, b) => b.deletedAt - a.deletedAt);
  const wrap = document.getElementById('trash-list');
  const empty = document.getElementById('trash-empty');

  wrap.innerHTML = trash.map(renderTrashItem).join('');
  empty.hidden = trash.length > 0;

  // Restaurar
  wrap.querySelectorAll('[data-restore]').forEach((btn) => {
    btn.addEventListener('click', () => {
      restoreFromTrash(btn.dataset.restore);
      renderTrash();
      showAlert('trash-alert', '✅ Elemento restaurado correctamente.', 'success');
    });
  });

  // Eliminar definitivamente
  wrap.querySelectorAll('[data-purge]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const trashId = btn.dataset.purge;
      const entry = getTrash().find((t) => t.trashId === trashId);
      showModal({
        title: 'Eliminar definitivamente',
        text: `"${trashItemTitle(entry)}" se eliminará de forma permanente. Esta acción no se puede deshacer.`,
        okLabel: 'Eliminar para siempre',
        onConfirm: () => {
          deleteFromTrash(trashId);
          renderTrash();
        },
      });
    });
  });
}

function bindEmptyTrash() {
  document.getElementById('empty-trash-btn').addEventListener('click', () => {
    if (!getTrash().length) {
      showAlert('trash-alert', 'La papelera ya está vacía.');
      return;
    }
    showModal({
      title: 'Vaciar papelera',
      text: 'Se eliminarán DEFINITIVAMENTE todos los elementos de la papelera. Esta acción no se puede deshacer.',
      okLabel: 'Vaciar papelera',
      onConfirm: () => {
        emptyTrash();
        renderTrash();
      },
    });
  });
}

/* ---------------- Render de cada elemento ---------------- */

function renderTrashItem(entry) {
  const isMovement = entry.kind === 'movement';
  const icon = isMovement
    ? (entry.data.type === 'income' ? '⬆️' : getCategory(entry.data.category).icon)
    : getAccountType(entry.data.type).icon;
  const kindLabel = isMovement ? 'Movimiento' : 'Cuenta';
  const amountBadge = isMovement
    ? `<span class="mov-amount ${entry.data.type}" style="font-weight:700">${entry.data.type === 'income' ? '+' : '−'} ${formatCurrency(entry.data.amount)}</span>`
    : '';

  return `
    <div class="trash-item">
      <div class="trash-icon">${icon}</div>
      <div class="trash-info">
        <div class="trash-title">${escapeHtml(trashItemTitle(entry))} ${amountBadge}</div>
        <div class="trash-meta">
          <span class="kind-badge">${kindLabel}</span>
          <span>🗑️ ${formatDateTime(entry.deletedAt)}</span>
          ${isMovement ? `<span>🏦 ${escapeHtml(accountName(getAccounts(), entry.data.accountId))}</span>` : ''}
        </div>
      </div>
      <div class="trash-actions">
        <button class="btn-restore" data-restore="${entry.trashId}" title="Restaurar">♻️</button>
        <button class="btn-purge" data-purge="${entry.trashId}" title="Eliminar definitivamente">❌</button>
      </div>
    </div>`;
}

function trashItemTitle(entry) {
  if (entry.kind === 'movement') {
    const m = entry.data;
    return (
      m.description ||
      (m.type === 'income' ? getIncomeSource(m.source).label : getCategory(m.category).label)
    );
  }
  return entry.data.name;
}
