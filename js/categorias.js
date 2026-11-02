/* =========================================================
   categorias.js — Gestor de categorías personalizadas (FinControl)
   [NUEVO] Ventana para crear, editar y eliminar las categorías de
   ingreso y de gasto de UNA cuenta. Crea su propio modal en el DOM,
   por lo que basta con incluir este script en la página.

   Uso:  openCategoryManager(accountId, 'expense' | 'income', onChange)
   onChange() se ejecuta tras cada cambio para que la página
   refresque sus chips de categorías.
   ========================================================= */

/** Iconos sugeridos para las categorías */
const CATEGORY_EMOJIS = [
  '🏷️', '🍔', '🚌', '🎓', '🎮', '🛍️', '🧾', '🏥', '📦', '💼',
  '🛠️', '🔄', '🏦', '↩️', '🎁', '🏠', '💡', '📱', '☕', '🎬',
  '👕', '🐶', '✈️', '💰', '📈', '🧑‍💻',
];

/** Estado de la ventana abierta */
const catManager = {
  overlay: null,
  accountId: null,
  kind: 'expense',
  editingId: null,
  confirmId: null,
  emoji: '🏷️',
  onChange: null,
};

/** Crea el modal una sola vez */
function ensureCategoryModal() {
  if (catManager.overlay) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'cat-modal-overlay';
  overlay.innerHTML = '<div class="modal cat-modal" role="dialog" aria-modal="true" aria-labelledby="cat-modal-title"><div id="cat-modal-body"></div></div>';
  document.body.appendChild(overlay);
  catManager.overlay = overlay;

  // Cerrar al pulsar fuera del cuadro
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCategoryManager();
  });
  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeCategoryManager();
  });

  const body = overlay.querySelector('#cat-modal-body');
  body.addEventListener('click', onCategoryClick);
  body.addEventListener('submit', onCategorySubmit);
}

function openCategoryManager(accountId, kind, onChange) {
  ensureCategoryModal();
  catManager.accountId = accountId;
  catManager.kind = kind === 'income' ? 'income' : 'expense';
  catManager.editingId = null;
  catManager.confirmId = null;
  catManager.emoji = '🏷️';
  catManager.onChange = onChange || null;
  renderCategoryManager();
  catManager.overlay.classList.add('open');
}

function closeCategoryManager() {
  if (catManager.overlay) catManager.overlay.classList.remove('open');
}

function notifyCategoryChange() {
  if (typeof catManager.onChange === 'function') catManager.onChange();
}

/* ---------------- Render ---------------- */

function renderCategoryManager() {
  const body = document.getElementById('cat-modal-body');
  const account = getAccountById(catManager.accountId);
  if (!account) { closeCategoryManager(); return; }

  const kind = catManager.kind;
  const cats = getAccountCategories(account.id, kind);
  const editing = cats.find((c) => c.id === catManager.editingId) || null;
  const kindWord = kind === 'income' ? 'ingreso' : 'gasto';

  // Panel de confirmación de eliminación (con advertencia si hay movimientos)
  let confirmHtml = '';
  const toDelete = cats.find((c) => c.id === catManager.confirmId);
  if (toDelete) {
    const count = countMovementsInCategory(account.id, kind, toDelete.id);
    const text = count > 0
      ? `⚠️ Hay ${count} transacción(es) registradas con la categoría "${toDelete.label}" en esta cuenta. Se conservarán con su nombre, pero la categoría ya no estará disponible para nuevos registros.`
      : `¿Eliminar la categoría "${toDelete.label}"?`;
    confirmHtml = `
      <div class="cat-confirm ${count > 0 ? 'warn' : ''}">
        <p>${escapeHtml(text)}</p>
        <div class="cat-confirm-actions">
          <button type="button" class="btn btn-outline btn-sm" data-act="cancel-delete">Cancelar</button>
          <button type="button" class="btn btn-danger btn-sm" data-act="confirm-delete">Eliminar</button>
        </div>
      </div>`;
  }

  const rows = cats.length
    ? cats.map((c) => `
        <div class="cat-row">
          <span class="cat-icon">${escapeHtml(c.icon)}</span>
          <span class="cat-name">${escapeHtml(c.label)}</span>
          <button type="button" class="cat-btn" data-act="edit" data-id="${escapeHtml(c.id)}" title="Editar" aria-label="Editar ${escapeHtml(c.label)}">✏️</button>
          <button type="button" class="cat-btn danger" data-act="delete" data-id="${escapeHtml(c.id)}" title="Eliminar" aria-label="Eliminar ${escapeHtml(c.label)}">🗑️</button>
        </div>`).join('')
    : `<div class="cat-empty">Esta cuenta no tiene categorías de ${kindWord}. Crea la primera abajo.</div>`;

  const emojiList = CATEGORY_EMOJIS.includes(catManager.emoji)
    ? CATEGORY_EMOJIS
    : [catManager.emoji, ...CATEGORY_EMOJIS];

  body.innerHTML = `
    <div class="cat-head">
      <h2 id="cat-modal-title">🏷️ Categorías</h2>
      <button type="button" class="btn-icon" data-act="close" aria-label="Cerrar">✕</button>
    </div>
    <p class="cat-sub">Cuenta: <strong>${escapeHtml(account.name)}</strong></p>

    <div class="cat-tabs">
      <button type="button" class="cat-tab ${kind === 'income' ? 'selected' : ''}" data-act="tab" data-kind="income">⬆️ Ingresos</button>
      <button type="button" class="cat-tab ${kind === 'expense' ? 'selected' : ''}" data-act="tab" data-kind="expense">⬇️ Gastos</button>
    </div>

    ${confirmHtml}
    <div class="cat-list">${rows}</div>

    <form id="cat-form" novalidate>
      <div class="field">
        <label for="cat-name">${editing ? 'Editar categoría' : 'Nueva categoría de ' + kindWord}</label>
        <input type="text" id="cat-name" maxlength="30" autocomplete="off"
               placeholder="${kind === 'income' ? 'Ej: Trabajo independiente, Alquiler…' : 'Ej: Suscripciones, Salud…'}"
               value="${editing ? escapeHtml(editing.label) : ''}">
        <span class="field-error" id="err-cat-name"></span>
      </div>
      <div class="cat-emojis" aria-label="Icono de la categoría">
        ${emojiList.map((e) => `<button type="button" class="cat-emoji ${e === catManager.emoji ? 'selected' : ''}" data-act="emoji" data-emoji="${escapeHtml(e)}">${escapeHtml(e)}</button>`).join('')}
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-sm">${editing ? 'Guardar cambios' : '+ Agregar categoría'}</button>
        ${editing ? '<button type="button" class="btn btn-outline btn-sm" data-act="cancel-edit">Cancelar edición</button>' : ''}
      </div>
    </form>`;
}

/* ---------------- Eventos ---------------- */

function onCategoryClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const kind = catManager.kind;

  if (act === 'close') {
    closeCategoryManager();
  } else if (act === 'tab') {
    catManager.kind = el.dataset.kind;
    catManager.editingId = null;
    catManager.confirmId = null;
    catManager.emoji = '🏷️';
    renderCategoryManager();
  } else if (act === 'emoji') {
    // Solo cambia la selección visual (no se pierde lo que se escribió)
    catManager.emoji = el.dataset.emoji;
    document.querySelectorAll('#cat-modal-body .cat-emoji').forEach((b) =>
      b.classList.toggle('selected', b === el)
    );
  } else if (act === 'edit') {
    const cat = getAccountCategories(catManager.accountId, kind).find((c) => c.id === el.dataset.id);
    if (!cat) return;
    catManager.editingId = cat.id;
    catManager.confirmId = null;
    catManager.emoji = cat.icon;
    renderCategoryManager();
    const input = document.getElementById('cat-name');
    if (input) input.focus();
  } else if (act === 'cancel-edit') {
    catManager.editingId = null;
    catManager.emoji = '🏷️';
    renderCategoryManager();
  } else if (act === 'delete') {
    catManager.confirmId = el.dataset.id;
    catManager.editingId = null;
    renderCategoryManager();
  } else if (act === 'cancel-delete') {
    catManager.confirmId = null;
    renderCategoryManager();
  } else if (act === 'confirm-delete') {
    deleteCategory(catManager.accountId, kind, catManager.confirmId);
    catManager.confirmId = null;
    renderCategoryManager();
    notifyCategoryChange();
  }
}

function onCategorySubmit(e) {
  e.preventDefault();
  const kind = catManager.kind;
  const name = document.getElementById('cat-name').value;
  const payload = { label: name, icon: catManager.emoji };

  const result = catManager.editingId
    ? updateCategory(catManager.accountId, kind, catManager.editingId, payload)
    : addCategory(catManager.accountId, kind, payload);

  if (!result.ok) {
    const err = document.getElementById('err-cat-name');
    err.textContent = result.error;
    err.classList.add('visible');
    document.getElementById('cat-name').classList.add('invalid');
    return;
  }

  catManager.editingId = null;
  catManager.emoji = '🏷️';
  renderCategoryManager();
  notifyCategoryChange();
  const input = document.getElementById('cat-name');
  if (input) input.focus();
}
