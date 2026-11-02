/* =========================================================
   entradas.js — Registro de entradas de dinero (FinControl)
   ========================================================= */

let selectedSource = ''; // [MODIFICADO] id de la categoría elegida (de la cuenta seleccionada)
const showModal = setupConfirmModal();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('inc-date').value = todayIso();
  populateAccountSelect(document.getElementById('inc-account'), getAccounts());
  buildSourceOptions();
  // [NUEVO] Al cambiar de cuenta se muestran SUS categorías de ingreso
  document.getElementById('inc-account').addEventListener('change', buildSourceOptions);
  bindIncomeForm();
  renderIncomes();
});

/**
 * [MODIFICADO] Chips de categorías de ingreso de la cuenta seleccionada
 * (antes era una lista fija). Incluye acceso al gestor de categorías.
 */
function buildSourceOptions() {
  const wrap = document.getElementById('inc-source-options');
  const accountId = document.getElementById('inc-account').value;

  if (!accountId) {
    selectedSource = '';
    wrap.innerHTML = '<span class="cat-hint">Selecciona una cuenta para ver sus categorías de ingreso.</span>';
    return;
  }

  const cats = getAccountCategories(accountId, 'income');
  if (!cats.some((c) => c.id === selectedSource)) selectedSource = '';
  // Conserva el comportamiento anterior: "Otro" preseleccionado si existe
  if (!selectedSource && cats.some((c) => c.id === 'other')) selectedSource = 'other';

  wrap.innerHTML =
    cats.map((s) => `<button type="button" class="chip-option ${s.id === selectedSource ? 'selected' : ''}" data-source="${escapeHtml(s.id)}">${escapeHtml(s.icon)} ${escapeHtml(s.label)}</button>`).join('') +
    (cats.length ? '' : '<span class="cat-hint">Esta cuenta no tiene categorías de ingreso. Crea una.</span>') +
    '<button type="button" class="chip-option chip-manage" data-manage="1">⚙️ Gestionar categorías</button>';

  wrap.querySelectorAll('[data-source]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedSource = btn.dataset.source;
      wrap.querySelectorAll('[data-source]').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('err-inc-category').classList.remove('visible');
    });
  });
  wrap.querySelector('[data-manage]').addEventListener('click', () => {
    openCategoryManager(accountId, 'income', () => {
      buildSourceOptions();
      renderIncomes(); // por si se editó el nombre de una categoría en uso
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
    // [NUEVO] Toda entrada debe tener una categoría de la cuenta
    if (!selectedSource) {
      document.getElementById('err-inc-category').classList.add('visible');
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
    selectedSource = '';
    populateAccountSelect(document.getElementById('inc-account'), getAccounts());
    buildSourceOptions(); // [MODIFICADO] vuelve a pedir cuenta → categorías
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
