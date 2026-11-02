/* =========================================================
   shared.js — Render común y modal de confirmación (FinControl)
   ========================================================= */

/** Rellena un <select> con las cuentas activas */
function populateAccountSelect(selectEl, accounts, selectedId) {
  if (!selectEl) return;
  const current = selectedId || selectEl.value;
  selectEl.innerHTML =
    '<option value="">— Selecciona una cuenta —</option>' +
    (accounts || [])
      .filter((a) => a.status === 'active')
      .map(
        (a) =>
          `<option value="${a.id}" ${a.id === current ? 'selected' : ''}>${escapeHtml(a.name)}</option>`
      )
      .join('');
}

/** Renderiza el icono de una cuenta según su tipo */
function accountIcon(account) {
  return getAccountType(account.type).icon;
}

/** Fila compacta de cuenta (usada en inicio) */
function renderMiniAccount(account) {
  const t = getAccountType(account.type);
  return `
    <div class="mini-account">
      <div class="acc-icon">${t.icon}</div>
      <div class="acc-info">
        <div class="acc-name">${escapeHtml(account.name)}</div>
        <div class="acc-type">${t.label}${account.notes ? ' · ' + escapeHtml(account.notes) : ''}</div>
      </div>
      <div class="acc-balance">${formatCurrency(account.balance)}</div>
    </div>`;
}

/**
 * Fila de movimiento (usada en inicio y listas)
 * [MODIFICADO] Ahora muestra: tipo (ingreso/gasto/transferencia), categoría,
 * cuenta (en transferencias "Origen → Destino"), fecha e importe.
 * options.perspective = [ids de cuenta]: al filtrar por cuenta, las
 * transferencias se muestran con + (entra) o − (sale) según esa vista.
 */
function renderMovementRow(movement, accounts, options) {
  const opts = options || {};
  const isIncome = movement.type === 'income';
  const isTransfer = movement.type === 'transfer'; // [NUEVO]
  const cat = resolveMovementCategory(movement, accounts); // [NUEVO]
  const icon = isTransfer ? '🔄' : (isIncome ? '⬆️' : cat.icon);
  const desc = movement.description || (isTransfer ? 'Transferencia' : cat.label);
  const showDelete = opts.onDelete !== undefined;

  // Signo e importe (las transferencias son neutras salvo que haya perspectiva de cuenta)
  let sign = isIncome ? '+' : '−';
  let amountClass = '';
  if (isTransfer) {
    const ids = opts.perspective || [];
    const fromIn = ids.includes(movement.accountId);
    const toIn = ids.includes(movement.toAccountId);
    if (toIn && !fromIn) { sign = '+'; amountClass = ' in'; }
    else if (fromIn && !toIn) { sign = '−'; amountClass = ' out'; }
    else sign = '⇄';
  }

  const accountText = isTransfer
    ? transferLabel(movement, accounts)
    : accountName(accounts, movement.accountId);
  const typeLabel = MOVEMENT_TYPE_LABELS[movement.type] || 'Movimiento';

  return `
    <div class="mov-row ${movement.type}" data-id="${movement.id}">
      <div class="mov-icon">${icon}</div>
      <div class="mov-info">
        <div class="mov-desc">${escapeHtml(desc)}</div>
        <div class="mov-meta">
          <span class="mov-badge ${movement.type}">${typeLabel}</span>
          <span>🏷️ ${escapeHtml(cat.label)}</span>
          <span>🏦 ${escapeHtml(accountText)}</span>
          <span>🕐 ${formatDateTime(movement.date)}</span>
        </div>
      </div>
      <div class="mov-amount${amountClass}">${sign} ${formatCurrency(movement.amount)}</div>
      ${showDelete ? `<div class="mov-actions"><button class="btn-del" data-del="${movement.id}" title="Enviar a la papelera">🗑️</button></div>` : ''}
    </div>`;
}

/** Configura el comportamiento del modal de confirmación */
function setupConfirmModal() {
  const overlay = document.getElementById('modal-overlay');
  const okBtn = document.getElementById('modal-ok');
  const cancelBtn = document.getElementById('modal-cancel');

  let onConfirm = null;

  function close() {
    overlay.classList.remove('open');
    onConfirm = null;
  }

  okBtn.addEventListener('click', () => {
    const fn = onConfirm;
    close();
    if (fn) fn();
  });
  cancelBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  /**
   * showModal({ title, text, okLabel, onConfirm })
   */
  return function showModal({ title, text, okLabel, onConfirm: fn }) {
    document.getElementById('modal-title').textContent = title || 'Confirmar';
    document.getElementById('modal-text').textContent = text || '';
    okBtn.textContent = okLabel || 'Eliminar';
    onConfirm = fn;
    overlay.classList.add('open');
  };
}

/** Muestra un mensaje de alerta temporal */
function showAlert(id, message, kind) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${kind || 'error'} visible`;
  el.textContent = message;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), 4000);
}
