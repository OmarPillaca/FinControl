/* =========================================================
   salidas.js — Registro de salidas/gastos (FinControl)
   ========================================================= */

let selectedCategory = '';
const showModal = setupConfirmModal();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('exp-date').value = todayIso();
  buildCategoryOptions();
  populateAccountSelect(document.getElementById('exp-account'), getAccounts());
  bindExpenseForm();
  renderExpenses();
});

function buildCategoryOptions() {
  const wrap = document.getElementById('exp-category-options');
  wrap.innerHTML = EXPENSE_CATEGORIES.map(
    (c) => `<button type="button" class="chip-option" data-cat="${c.id}">${c.icon} ${c.label}</button>`
  ).join('');

  wrap.querySelectorAll('.chip-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.cat;
      wrap.querySelectorAll('.chip-option').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('err-exp-category').classList.remove('visible');
    });
  });
}

function bindExpenseForm() {
  const form = document.getElementById('expense-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const amount = parseAmount(document.getElementById('exp-amount').value);
    const dateInput = document.getElementById('exp-date').value;
    const accountId = document.getElementById('exp-account').value;
    const description = document.getElementById('exp-desc').value.trim(); // OPCIONAL

    // ---- Validaciones (descripción NO obligatoria) ----
    let valid = true;
    if (!isValidAmount(amount)) {
      toggleField('err-exp-amount', 'exp-amount', true);
      valid = false;
    }
    if (!dateInput) {
      toggleField('err-exp-date', 'exp-date', true);
      valid = false;
    }
    if (!accountId) {
      toggleField('err-exp-account', 'exp-account', true);
      valid = false;
    }
    if (!selectedCategory) {
      document.getElementById('err-exp-category').classList.add('visible');
      valid = false;
    }
    if (!valid) return;

    // Registrar vía capa de almacenamiento (descuenta el saldo automáticamente)
    const result = createMovement({
      type: 'expense',
      amount,
      accountId,
      description, // puede ir vacío
      category: selectedCategory,
    });

    if (!result.ok) {
      showAlert('expense-alert', result.error);
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
    document.getElementById('exp-date').value = todayIso();
    selectedCategory = '';
    document.querySelectorAll('#exp-category-options .chip-option').forEach((b) =>
      b.classList.remove('selected')
    );
    populateAccountSelect(document.getElementById('exp-account'), getAccounts());
    renderExpenses();
    showAlert('expense-success', '✅ Salida registrada. Saldo actualizado.', 'success');
  });

  // Limpiar errores al corregir
  ['exp-amount', 'exp-date', 'exp-account'].forEach((id) => {
    document.getElementById(id).addEventListener('input', (e) => {
      e.target.classList.remove('invalid');
      const err = document.getElementById('err-' + id.replace('exp-', 'exp-'));
      if (err) err.classList.remove('visible');
    });
  });
}

function renderExpenses() {
  const accounts = getAccounts();
  const expenses = getMovements()
    .filter((m) => m.type === 'expense')
    .sort((a, b) => b.date - a.date);

  const wrap = document.getElementById('expenses-list');
  const empty = document.getElementById('expenses-empty');
  wrap.innerHTML = expenses.length
    ? `<div class="mov-card">${expenses.map((m) => renderMovementRow(m, accounts, { onDelete: true })).join('')}</div>`
    : '';
  empty.hidden = expenses.length > 0;

  wrap.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.del;
      showModal({
        title: 'Eliminar salida',
        text: 'La salida se enviará a la papelera y el saldo de la cuenta se ajustará automáticamente.',
        okLabel: 'Enviar a la papelera',
        onConfirm: () => {
          sendToTrash('movement', id);
          renderExpenses();
          showAlert('expense-success', '🗑️ Salida enviada a la papelera.', 'success');
        },
      });
    });
  });
}

function toggleField(errId, inputId, show) {
  document.getElementById(errId).classList.toggle('visible', show);
  document.getElementById(inputId).classList.toggle('invalid', show);
}
