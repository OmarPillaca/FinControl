/* =========================================================
   storage.js — Capa de almacenamiento independiente (FinControl)
   Encapsula localStorage detrás de una API. Si mañana se
   cambia a una API/BD real, solo se reemplaza este archivo.
   ========================================================= */

/** Claves bajo las que se persiste cada colección */
const STORAGE_KEYS = {
  accounts:  'fincontrol_accounts',
  movements: 'fincontrol_movements',
  trash:     'fincontrol_trash',
  theme:     'fincontrol_theme',
};

/** Lee y parsea una colección desde localStorage */
function readCollection(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Error leyendo "${key}":`, err);
    return [];
  }
}

/** Escribe una colección completa en localStorage */
function writeCollection(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error(`Error guardando "${key}":`, err);
    return false;
  }
}

/* ------------------------- Cuentas ------------------------- */

function getAccounts() {
  return readCollection(STORAGE_KEYS.accounts);
}

function saveAccount(account) {
  const accounts = getAccounts();
  accounts.push(account);
  return writeCollection(STORAGE_KEYS.accounts, accounts);
}

function updateAccount(accountId, changes) {
  const accounts = getAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) return false;
  accounts[idx] = { ...accounts[idx], ...changes };
  return writeCollection(STORAGE_KEYS.accounts, accounts);
}

function getAccountById(accountId) {
  return getAccounts().find((a) => a.id === accountId) || null;
}

/* ----------------------- Movimientos ----------------------- */

function getMovements() {
  return readCollection(STORAGE_KEYS.movements);
}

function saveMovement(movement) {
  const movements = getMovements();
  movements.push(movement);
  return writeCollection(STORAGE_KEYS.movements, movements);
}

/**
 * Registra un movimiento y aplica su efecto en el saldo de la cuenta.
 * type: 'income' suma al saldo; 'expense' resta.
 * Devuelve { ok, movement } o { ok:false, error }.
 */
function createMovement({ type, amount, accountId, description, category, source }) {
  if (!isValidAmount(amount)) return { ok: false, error: 'El monto debe ser un número mayor que cero.' };
  const account = getAccountById(accountId);
  if (!account || account.status !== 'active') return { ok: false, error: 'Debes seleccionar una cuenta válida.' };

  const newBalance = type === 'income'
    ? Number(account.balance) + Number(amount)
    : Number(account.balance) - Number(amount);

  updateAccount(accountId, { balance: Number(newBalance.toFixed(2)) });

  const movement = {
    id: generateId(),
    type,                                    // 'income' | 'expense'
    amount: Number(amount),
    accountId,
    description: (description || '').trim(), // opcional en salidas
    category: category || null,              // solo salidas
    source: source || null,                  // solo entradas
    date: Date.now(),
  };
  saveMovement(movement);
  return { ok: true, movement };
}

/* -------------------------- Papelera ------------------------ */

function getTrash() {
  return readCollection(STORAGE_KEYS.trash);
}

/**
 * Envía un elemento a la papelera con metadatos de restauración.
 * Revierte el efecto en el saldo cuando el elemento es un movimiento.
 */
function sendToTrash(kind, id) {
  let item = null;

  if (kind === 'movement') {
    const movements = getMovements();
    const idx = movements.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    item = movements[idx];
    movements.splice(idx, 1);
    writeCollection(STORAGE_KEYS.movements, movements);
    // Revertir el efecto del movimiento en el saldo de su cuenta
    const acc = getAccountById(item.accountId);
    if (acc) {
      const diff = item.type === 'income' ? -item.amount : item.amount;
      updateAccount(acc.id, { balance: Number((acc.balance + diff).toFixed(2)) });
    }
  } else if (kind === 'account') {
    const accounts = getAccounts();
    const idx = accounts.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    item = accounts[idx];
    accounts.splice(idx, 1);
    writeCollection(STORAGE_KEYS.accounts, accounts);
  }

  if (!item) return false;
  const trash = getTrash();
  trash.push({ trashId: generateId(), kind, deletedAt: Date.now(), data: item });
  return writeCollection(STORAGE_KEYS.trash, trash);
}

/**
 * Restaura un elemento de la papelera.
 * Los movimientos vuelven a afectar el saldo de su cuenta (si existe).
 */
function restoreFromTrash(trashId) {
  const trash = getTrash();
  const idx = trash.findIndex((t) => t.trashId === trashId);
  if (idx === -1) return false;
  const entry = trash[idx];

  if (entry.kind === 'movement') {
    const acc = getAccountById(entry.data.accountId);
    if (acc) {
      const diff = entry.data.type === 'income' ? entry.data.amount : -entry.data.amount;
      updateAccount(acc.id, { balance: Number((acc.balance + diff).toFixed(2)) });
    }
    const movements = getMovements();
    movements.push(entry.data);
    writeCollection(STORAGE_KEYS.movements, movements);
  } else if (entry.kind === 'account') {
    const accounts = getAccounts();
    accounts.push(entry.data);
    writeCollection(STORAGE_KEYS.accounts, accounts);
  }

  trash.splice(idx, 1);
  return writeCollection(STORAGE_KEYS.trash, trash);
}

/** Elimina definitivamente un elemento de la papelera (sin restaurar) */
function deleteFromTrash(trashId) {
  const trash = getTrash();
  const idx = trash.findIndex((t) => t.trashId === trashId);
  if (idx === -1) return false;
  trash.splice(idx, 1);
  return writeCollection(STORAGE_KEYS.trash, trash);
}

/** Vacía completamente la papelera */
function emptyTrash() {
  return writeCollection(STORAGE_KEYS.trash, []);
}

/* ------------------------ Configuración --------------------- */

function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
}

function setTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

/** Borra todos los datos de la aplicación (con confirmación previa en UI) */
function clearAllData() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}
