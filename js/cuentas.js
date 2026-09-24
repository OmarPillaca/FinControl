/* =========================================================
   cuentas.js — Gestión de cuentas y tarjetas (FinControl)
   ========================================================= */

let selectedType = '';
const showModal = setupConfirmModal();

document.addEventListener('DOMContentLoaded', () => {
  buildTypeOptions();
  bindAccountForm();
  renderAccounts();
});

/* ---------------- Tipo de cuenta (chips) ---------------- */

function buildTypeOptions() {
  const wrap = document.getElementById('acc-type-options');
  wrap.innerHTML = ACCOUNT_TYPES.map(
    (t) => `<button type="button" class="type-option" data-type="${t.id}">${t.icon} ${t.label}</button>`
  ).join('');

  wrap.querySelectorAll('.type-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type;
      wrap.querySelectorAll('.type-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      // Mostrar campos exclusivos de tarjeta
      document.getElementById('card-fields').classList.toggle('visible', selectedType === 'card');
      document.getElementById('err-acc-type').classList.remove('visible');
    });
  });
}

/* ---------------- Formulario ---------------- */

function bindAccountForm() {
  const form = document.getElementById('account-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById('acc-name').value.trim();
    const balance = parseAmount(document.getElementById('acc-balance').value || '0');
    const status = document.getElementById('acc-status').value;
    const notes = document.getElementById('acc-notes').value.trim();

    let valid = true;
    if (!name) {
      showFieldError('err-acc-name', 'acc-name', true);
      valid = false;
    }
    if (!selectedType) {
      document.getElementById('err-acc-type').classList.add('visible');
      valid = false;
    }
    if (Number.isNaN(balance) || balance < 0) {
      showFieldError('err-acc-balance', 'acc-balance', true);
      valid = false;
    }

    // Datos exclusivos de tarjeta
    let card = null;
    if (selectedType === 'card') {
      const last4 = document.getElementById('acc-card-last4').value.trim();
      const limit = document.getElementById('acc-card-limit').value.trim();
      const used = document.getElementById('acc-card-used').value.trim();

      if (last4 && !/^\d{4}$/.test(last4)) {
        showFieldError('err-acc-last4', 'acc-card-last4', true);
        valid = false;
      }
      const limitNum = limit === '' ? null : parseAmount(limit);
      if (limit !== '' && (Number.isNaN(limitNum) || limitNum < 0)) {
        showFieldError('err-acc-limit', 'acc-card-limit', true);
        valid = false;
      }
      const usedNum = used === '' ? null : parseAmount(used);
      if (used !== '' && (Number.isNaN(usedNum) || usedNum < 0)) {
        showFieldError('err-acc-used', 'acc-card-used', true);
        valid = false;
      }
      card = { last4: last4 || null, limit: limitNum, used: usedNum || 0 };
    }

    if (!valid) return;

    saveAccount({
      id: generateId(),
      name,
      type: selectedType,
      balance,
      status,
      notes: notes || null,
      card, // { last4, limit, used } solo para tarjetas
      createdAt: Date.now(),
    });

    form.reset();
    selectedType = '';
    document.querySelectorAll('.type-option').forEach((b) => b.classList.remove('selected'));
    document.getElementById('card-fields').classList.remove('visible');
    renderAccounts();
    showAlert('accounts-alert', '✅ Cuenta guardada correctamente.', 'success');
  });

  document.getElementById('acc-form-reset').addEventListener('click', () => {
    selectedType = '';
    document.querySelectorAll('.type-option').forEach((b) => b.classList.remove('selected'));
    document.getElementById('card-fields').classList.remove('visible');
    clearErrors();
  });
}

/* ---------------- Render del listado ---------------- */

function renderAccounts() {
  const accounts = getAccounts();
  const grid = document.getElementById('accounts-grid');
  const empty = document.getElementById('accounts-empty');

  grid.innerHTML = accounts.map(renderAccountCard).join('');
  empty.hidden = accounts.length > 0;

  // Acción eliminar → papelera (con advertencia si tiene movimientos)
  grid.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.del;
      const account = getAccountById(id);
      if (!account) return;

      const count = getMovements().filter((m) => m.accountId === id).length;
      const text = count > 0
        ? `"${account.name}" tiene ${count} movimiento(s) registrado(s). ¿Deseas enviarla a la papelera? Los movimientos se conservan y el total se recalculará.`
        : `¿Enviar la cuenta "${account.name}" a la papelera?`;

      showModal({
        title: 'Eliminar cuenta',
        text,
        okLabel: 'Enviar a la papelera',
        onConfirm: () => {
          sendToTrash('account', id);
          renderAccounts();
          showAlert('accounts-alert', '🗑️ Cuenta enviada a la papelera.', 'success');
        },
      });
    });
  });
}

function renderAccountCard(account) {
  const t = getAccountType(account.type);
  const isCard = account.type === 'card' && account.card;

  let cardInfo = '';
  if (isCard) {
    const last4 = account.card.last4 ? `•••• ${account.card.last4}` : '—';
    cardInfo = `
      <div class="card-meta"><span>Tarjeta:</span><span>${last4}</span></div>`;
    if (account.card.limit) {
      const used = Number(account.card.used) || 0;
      const pct = Math.min(100, Math.round((used / account.card.limit) * 100));
      cardInfo += `
        <div class="card-meta"><span>Usado:</span><span>${formatCurrency(used)} / ${formatCurrency(account.card.limit)}</span></div>
        <div class="usage-bar"><div class="usage-fill" style="width:${pct}%"></div></div>`;
    }
  }

  return `
    <div class="account-card">
      <div class="acc-head">
        <div class="acc-icon">${t.icon}</div>
        <div>
          <div class="acc-name">${escapeHtml(account.name)}</div>
          <span class="chip">${t.label}</span>
        </div>
      </div>
      <div class="acc-balance">${formatCurrency(account.balance)}</div>
      <div class="acc-details">
        <div class="card-meta"><span>Estado:</span><span>${account.status === 'active' ? '✅ Activa' : '⏸️ Inactiva'}</span></div>
        ${cardInfo}
        ${account.notes ? `<div class="card-meta"><span>Nota:</span><span>${escapeHtml(account.notes)}</span></div>` : ''}
      </div>
      <div class="acc-actions">
        <button class="btn btn-danger btn-sm" data-del="${account.id}">🗑️ Eliminar</button>
      </div>
    </div>`;
}

/* ---------------- Helpers de validación ---------------- */

function showFieldError(errId, inputId, show) {
  document.getElementById(errId).classList.toggle('visible', show);
  if (inputId) document.getElementById(inputId).classList.toggle('invalid', show);
}

function clearErrors() {
  ['err-acc-name', 'err-acc-type', 'err-acc-balance', 'err-acc-last4', 'err-acc-limit', 'err-acc-used']
    .forEach((id) => document.getElementById(id).classList.remove('visible'));
  ['acc-name', 'acc-balance', 'acc-card-last4', 'acc-card-limit', 'acc-card-used']
    .forEach((id) => document.getElementById(id) && document.getElementById(id).classList.remove('invalid'));
}
