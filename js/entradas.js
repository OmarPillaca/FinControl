/* =========================================================
   entradas.js — Registro de entradas de dinero (FinControl)
   ========================================================= */

let selectedSource = 'other';
const showModal = setupConfirmModal();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('inc-date').value = todayIso();
  buildSourceOptions();
  populateAccountSelect(document.getElementById('inc-account'), getAccounts());
  bindIncomeForm();
  renderIncomes();
});

function buildSourceOptions() {
  const wrap = document.getElementById('inc-source-options');
  wrap.innerHTML = INCOME_SOURCES.map(
    (s) => `<button type="button" class="chip-option ${s.id === 'other' ? 'selected' : ''}" data-source="${s.id}">${s.icon} ${s.label}</button>`
  ).join('');

  wrap.querySelectorAll('.chip-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedSource = btn.dataset.source;
      wrap.querySelectorAll('.chip-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

function bindIncomeForm() {
  const form = document.getElementById('income-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const amount = parseAmount(document.getElementById('inc-amount').value);
    const dateInput = document.getElementById('inc-date').value;
    const accountId = document.getElementById('inc-account').value;
    const description = document.getElementById('inc-desc').value.trim();

    // ---- Validaciones ----
    let valid = true;
    if (!isValidAmount(amount)) {
      toggleField('err-inc-amount', 'inc-amount', true);
      valid = false;
    }
    if (!dateInput) {
      toggleField('err-inc-date', 'inc-date', true);
      valid = false;
    }
    if (!accountId) {
      toggleField('err-inc-account', 'inc-account', true);
      valid = false;
    }
    if (!valid) return;

    // Registrar vía capa de almacenamiento (actualiza saldo automáticamente)
    const result = createMovement({
      type: 'income',
      amount,
      accountId,
      description,
      source: selectedSource,
    });

    if (!result.ok) {
      showAlert('income-alert', result.error);
      return;
    }

    // Ajustar la fecha elegida por el usuario
    if (dateInput !== todayIso()) {
      const movements = getMovements();
      const mov = movements.find((m) => m.id === result.movement.id);
      if (mov) {
        const d = new Date(dateInput + 'T12:00:00');
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes(), 0, 0);
        mov.date = d.getTime();
        writeCollection(STORAGE_KEYS.movements, movements);
      }
    }

    form.reset();
    document.getElementById('inc-date').value = todayIso();
    selectedSource = 'other';
    document.querySelectorAll('#inc-source-options .chip-option').forEach((b) =>
      b.classList.toggle('selected', b.dataset.source === 'other')
    );
    populateAccountSelect(document.getElementById('inc-account'), getAccounts());
    renderIncomes();
    showAlert('income-success', '✅ Entrada registrada. Saldo actualizado.', 'success');
  });

  // Limpiar error al corregir
  ['inc-amount', 'inc-date', 'inc-account'].forEach((id) => {
    document.getElementById(id).addEventListener('input', (e) => {
      e.target.classList.remove('invalid');
      const errId = 'err-' + id.replace('inc', 'inc');
      const err = document.getElementById(errId);
      if (err) err.classList.remove('visible');
    });
  });
}

function renderIncomes() {
  const accounts = getAccounts();
  const incomes = getMovements()
    .filter((m) => m.type === 'income')
    .sort((a, b) => b.date - a.date);

  const wrap = document.getElementById('incomes-list');
  const empty = document.getElementById('incomes-empty');
  wrap.innerHTML = incomes.length
    ? `<div class="mov-card">${incomes.map((m) => renderMovementRow(m, accounts, { onDelete: true })).join('')}</div>`
    : '';
  empty.hidden = incomes.length > 0;

  wrap.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.del;
      showModal({
        title: 'Eliminar entrada',
        text: 'La entrada se enviará a la papelera y el saldo de la cuenta se ajustará automáticamente.',
        okLabel: 'Enviar a la papelera',
        onConfirm: () => {
          sendToTrash('movement', id);
          renderIncomes();
          showAlert('income-success', '🗑️ Entrada enviada a la papelera.', 'success');
        },
      });
    });
  });
}

function toggleField(errId, inputId, show) {
  document.getElementById(errId).classList.toggle('visible', show);
  document.getElementById(inputId).classList.toggle('invalid', show);
}
