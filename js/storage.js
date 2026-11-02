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
  walletSettings: 'fincontrol_wallet_settings', // [NUEVO] visibilidad / inclusión de la billetera
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
  // [MODIFICADO] Toda cuenta nueva nace con categorías propias (copia de las predeterminadas)
  if (!account.categories) account = { ...account, categories: buildDefaultCategories() };
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
 * [MODIFICADO] La categoría (source en ingresos, category en gastos) debe
 * pertenecer a las categorías de ESA cuenta. Se guarda también su nombre
 * e icono para conservarlos si la categoría se elimina más adelante.
 * Devuelve { ok, movement } o { ok:false, error }.
 */
function createMovement({ type, amount, accountId, description, category, source }) {
  if (!isValidAmount(amount)) return { ok: false, error: 'El monto debe ser un número mayor que cero.' };
  const account = getAccountById(accountId);
  if (!account || account.status !== 'active') return { ok: false, error: 'Debes seleccionar una cuenta válida.' };

  // [NUEVO] Validar que la categoría exista en la cuenta elegida
  if (type !== 'income' && type !== 'expense') return { ok: false, error: 'Tipo de movimiento no válido.' };
  const chosenId = type === 'income' ? source : category;
  const chosen = getAccountCategories(accountId, type).find((c) => c.id === chosenId);
  if (!chosen) return { ok: false, error: 'Selecciona una categoría válida para esta cuenta.' };

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
    categoryName: chosen.label,              // [NUEVO] respaldo del nombre de categoría
    categoryIcon: chosen.icon,               // [NUEVO] respaldo del icono de categoría
    date: Date.now(),
  };
  saveMovement(movement);
  return { ok: true, movement };
}

/* =========================================================
   [NUEVO] Efecto de un movimiento sobre los saldos
   sign = 1 → aplicar | sign = -1 → revertir
   Soporta ingresos, gastos y transferencias (dos cuentas).
   ========================================================= */

/** Suma/resta un importe al saldo de una cuenta (si existe) */
function adjustAccountBalance(accountId, delta) {
  const acc = getAccountById(accountId);
  if (!acc) return false;
  return updateAccount(accountId, { balance: Number((Number(acc.balance) + delta).toFixed(2)) });
}

function applyMovementEffect(movement, sign) {
  const amt = Number(movement.amount) || 0;
  if (movement.type === 'income') {
    adjustAccountBalance(movement.accountId, sign * amt);
  } else if (movement.type === 'expense') {
    adjustAccountBalance(movement.accountId, -sign * amt);
  } else if (movement.type === 'transfer') {
    adjustAccountBalance(movement.accountId, -sign * amt);   // origen
    adjustAccountBalance(movement.toAccountId, sign * amt);  // destino
  }
}

/* =========================================================
   [NUEVO] TRANSFERENCIAS ENTRE CUENTAS
   Un único movimiento type:'transfer' con cuenta origen
   (accountId) y destino (toAccountId). Resta del origen y
   suma al destino en el mismo instante.
   ========================================================= */
function createTransfer({ fromId, toId, amount, description, date }) {
  if (!isValidAmount(amount)) return { ok: false, error: 'El monto debe ser un número mayor que cero.' };
  const from = getAccountById(fromId);
  const to = getAccountById(toId);
  if (!from || from.status !== 'active') return { ok: false, error: 'Selecciona una cuenta de origen válida.' };
  if (!to || to.status !== 'active') return { ok: false, error: 'Selecciona una cuenta de destino válida.' };
  if (fromId === toId) return { ok: false, error: 'La cuenta de origen y la de destino deben ser distintas.' };

  const movement = {
    id: generateId(),
    type: 'transfer',
    amount: Number(amount),
    accountId: fromId,        // origen
    toAccountId: toId,        // destino
    description: (description || '').trim(),
    category: null,
    source: null,
    date: date || Date.now(),
  };
  applyMovementEffect(movement, 1);
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
    // Revertir el efecto del movimiento en el saldo de su(s) cuenta(s)
    // [MODIFICADO] ahora también revierte transferencias (origen y destino)
    applyMovementEffect(item, -1);
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
    // [MODIFICADO] vuelve a aplicar ingreso, gasto o transferencia (ambas cuentas)
    applyMovementEffect(entry.data, 1);
    const movements = getMovements();
    movements.push(entry.data);
    writeCollection(STORAGE_KEYS.movements, movements);
  } else if (entry.kind === 'account') {
    const accounts = getAccounts();
    const restored = entry.data.categories
      ? entry.data
      : { ...entry.data, categories: buildDefaultCategories() }; // [NUEVO]
    accounts.push(restored);
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

/* =========================================================
   [NUEVO] CONFIGURACIÓN DE LA BILLETERA
   - visible:        la billetera se muestra (o no) en el panel principal
   - includeInTotal: su saldo se suma (o no) al monto global
   Se guarda en localStorage y se recuerda entre sesiones.
   Por defecto: visible e incluida (igual que el comportamiento previo).
   ========================================================= */
const DEFAULT_WALLET_SETTINGS = { visible: true, includeInTotal: true };

function getWalletSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.walletSettings);
    const saved = raw ? JSON.parse(raw) : {};
    return {
      visible: typeof saved.visible === 'boolean' ? saved.visible : DEFAULT_WALLET_SETTINGS.visible,
      includeInTotal: typeof saved.includeInTotal === 'boolean' ? saved.includeInTotal : DEFAULT_WALLET_SETTINGS.includeInTotal,
    };
  } catch (err) {
    console.error('Error leyendo la configuración de la billetera:', err);
    return { ...DEFAULT_WALLET_SETTINGS };
  }
}

/** Guarda cambios parciales: setWalletSettings({ visible: false }) */
function setWalletSettings(changes) {
  const next = { ...getWalletSettings(), ...changes };
  try {
    localStorage.setItem(STORAGE_KEYS.walletSettings, JSON.stringify(next));
  } catch (err) {
    console.error('Error guardando la configuración de la billetera:', err);
  }
  return next;
}

/* =========================================================
   [NUEVO] CATEGORÍAS PERSONALIZADAS POR CUENTA
   Se guardan dentro de cada cuenta:
     account.categories = { income: [...], expense: [...] }
   y cada categoría es { id, label, icon }.
   Las listas fijas anteriores (utils.js) solo se usan como punto
   de partida: cada cuenta recibe su propia copia editable, con los
   mismos IDs, para que los movimientos antiguos sigan funcionando.
   ========================================================= */

/** Copia de las categorías predeterminadas */
function buildDefaultCategories() {
  const clone = (c) => ({ id: c.id, label: c.label, icon: c.icon });
  return {
    income: INCOME_SOURCES.map(clone),
    expense: EXPENSE_CATEGORIES.map(clone),
  };
}

/** Categorías de una cuenta para un tipo ('income' | 'expense') */
function getAccountCategories(accountId, kind) {
  const acc = getAccountById(accountId);
  if (!acc) return [];
  const cats = acc.categories || buildDefaultCategories();
  return (cats[kind] || []).map((c) => ({ ...c }));
}

/** Cantidad de movimientos de una cuenta que usan una categoría */
function countMovementsInCategory(accountId, kind, categoryId) {
  return getMovements().filter((m) =>
    m.accountId === accountId &&
    m.type === kind &&
    (kind === 'income' ? m.source : m.category) === categoryId
  ).length;
}

/** Valida y normaliza el nombre de una categoría */
function validateCategoryName(cats, kind, label, ignoreId) {
  const name = (label || '').trim();
  if (!name) return { error: 'Escribe un nombre para la categoría.' };
  if (name.length > 30) return { error: 'El nombre no puede superar los 30 caracteres.' };
  const dup = cats[kind].some((c) => c.id !== ignoreId && c.label.toLowerCase() === name.toLowerCase());
  if (dup) return { error: 'Ya existe una categoría con ese nombre en esta cuenta.' };
  return { name };
}

function addCategory(accountId, kind, { label, icon }) {
  const acc = getAccountById(accountId);
  if (!acc) return { ok: false, error: 'Cuenta no encontrada.' };
  if (kind !== 'income' && kind !== 'expense') return { ok: false, error: 'Tipo de categoría no válido.' };
  const cats = acc.categories || buildDefaultCategories();
  const check = validateCategoryName(cats, kind, label, null);
  if (check.error) return { ok: false, error: check.error };
  const category = { id: generateId(), label: check.name, icon: icon || '🏷️' };
  cats[kind].push(category);
  updateAccount(accountId, { categories: cats });
  return { ok: true, category };
}

function updateCategory(accountId, kind, categoryId, { label, icon }) {
  const acc = getAccountById(accountId);
  if (!acc) return { ok: false, error: 'Cuenta no encontrada.' };
  const cats = acc.categories || buildDefaultCategories();
  const idx = (cats[kind] || []).findIndex((c) => c.id === categoryId);
  if (idx === -1) return { ok: false, error: 'Categoría no encontrada.' };
  const check = validateCategoryName(cats, kind, label, categoryId);
  if (check.error) return { ok: false, error: check.error };
  cats[kind][idx] = { ...cats[kind][idx], label: check.name, icon: icon || cats[kind][idx].icon };
  updateAccount(accountId, { categories: cats });
  return { ok: true, category: cats[kind][idx] };
}

function deleteCategory(accountId, kind, categoryId) {
  const acc = getAccountById(accountId);
  if (!acc) return { ok: false, error: 'Cuenta no encontrada.' };
  const cats = acc.categories || buildDefaultCategories();
  const before = (cats[kind] || []).length;
  cats[kind] = (cats[kind] || []).filter((c) => c.id !== categoryId);
  if (cats[kind].length === before) return { ok: false, error: 'Categoría no encontrada.' };
  updateAccount(accountId, { categories: cats });
  return { ok: true };
}

/**
 * Migración (se ejecuta al cargar): las cuentas creadas antes de esta
 * versión reciben su copia de las categorías predeterminadas.
 */
function migrateAccountCategories() {
  const accounts = getAccounts();
  let changed = false;
  accounts.forEach((a) => {
    if (!a.categories) {
      a.categories = buildDefaultCategories();
      changed = true;
    }
  });
  if (changed) writeCollection(STORAGE_KEYS.accounts, accounts);
}
migrateAccountCategories();

/** Borra todos los datos de la aplicación (con confirmación previa en UI) */
function clearAllData() {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
}
