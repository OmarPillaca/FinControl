/* =========================================================
   utils.js — Funciones reutilizables (FinControl)
   ========================================================= */

/** Formatea un número como moneda peruana: S/ 4,850.50 */
function formatCurrency(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const int = Math.floor(abs).toLocaleString('en-US');
  const dec = abs.toFixed(2).split('.')[1];
  return `${sign}S/ ${int}.${dec}`;
}

/** Formatea una fecha ISO (yyyy-mm-dd) como dd/mm/yyyy */
function formatDate(dateIso) {
  const d = new Date(dateIso + 'T00:00:00');
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Formatea un timestamp (ms) como dd/mm/yyyy hh:mm */
function formatDateTime(ts) {
  const d = new Date(ts);
  const pad = (x) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Genera un identificador único */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Suma los saldos actuales de las cuentas activas */
function sumAccountBalances(accounts) {
  return (accounts || [])
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
}

/** Suma saldos de cuentas activas filtradas por tipo */
function sumByType(accounts, type) {
  return (accounts || [])
    .filter((a) => a.status === 'active' && a.type === type)
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
}

/** Suma montos de una lista de movimientos */
function sumMovements(list) {
  return (list || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
}

/** Valida que un monto sea numérico y mayor que cero */
function isValidAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Parsea un monto desde texto (admite coma decimal); NaN si es inválido */
function parseAmount(text) {
  if (typeof text !== 'string') return NaN;
  const clean = text.trim().replace(/\s/g, '').replace(/,/g, '.');
  if (!clean || !/^\d+(\.\d{1,2})?$/.test(clean)) return NaN;
  return parseFloat(clean);
}

/** Devuelve los N movimientos más recientes */
function latestMovements(list, n) {
  return [...(list || [])]
    .sort((a, b) => b.date - a.date)
    .slice(0, n || 5);
}

/** Devuelve la clave local (yyyy-mm-dd) de un timestamp sin usar UTC */
function dayKey(ts) {
  const d = new Date(ts);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Agrupa movimientos por día (más recientes primero) */
function groupByDate(list) {
  const groups = [];
  const map = new Map();
  const sorted = [...(list || [])].sort((a, b) => b.date - a.date);
  for (const m of sorted) {
    const k = dayKey(m.date);
    if (!map.has(k)) {
      const items = [];
      map.set(k, items);
      groups.push({ date: k, items });
    }
    map.get(k).push(m);
  }
  return groups;
}

/** Escapa HTML para prevenir inyección al renderizar datos del usuario */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------------------------------------------------------
   Constantes compartidas (tipos, categorías, iconos)
   --------------------------------------------------------- */
const ACCOUNT_TYPES = [
  { id: 'cash',   label: 'Efectivo',  icon: '💵' },
  { id: 'card',   label: 'Tarjeta',   icon: '💳' },
  { id: 'wallet', label: 'Billetera', icon: '📱' },
];

const EXPENSE_CATEGORIES = [
  { id: 'food',          label: 'Alimentación',     icon: '🍔' },
  { id: 'transport',     label: 'Transporte',       icon: '🚌' },
  { id: 'studies',       label: 'Estudios',         icon: '🎓' },
  { id: 'entertainment', label: 'Entretenimiento',  icon: '🎮' },
  { id: 'shopping',      label: 'Compras',          icon: '🛍️' },
  { id: 'services',      label: 'Servicios',        icon: '🧾' },
  { id: 'health',        label: 'Salud',            icon: '🏥' },
  { id: 'other',         label: 'Otros',            icon: '📦' },
];

const INCOME_SOURCES = [
  { id: 'salary',   label: 'Sueldo',                 icon: '💼' },
  { id: 'work',     label: 'Pago de trabajo',        icon: '🛠️' },
  { id: 'transfer', label: 'Transferencia recibida', icon: '🔄' },
  { id: 'deposit',  label: 'Depósito',               icon: '🏦' },
  { id: 'refund',   label: 'Devolución',             icon: '↩️' },
  { id: 'gift',     label: 'Dinero recibido',        icon: '🎁' },
  { id: 'other',    label: 'Otro',                   icon: '📦' },
];

/** Obtiene el tipo de cuenta por id */
function getAccountType(id) {
  return ACCOUNT_TYPES.find((t) => t.id === id) || { id, label: 'Cuenta', icon: '💰' };
}

/** Obtiene categoría de gasto por id */
function getCategory(id) {
  return EXPENSE_CATEGORIES.find((c) => c.id === id) || { id, label: 'Otros', icon: '📦' };
}

/** Obtiene origen de ingreso por id */
function getIncomeSource(id) {
  return INCOME_SOURCES.find((s) => s.id === id) || { id, label: 'Otro', icon: '📦' };
}

/** Devuelve la fecha de hoy en formato ISO local yyyy-mm-dd */
function todayIso() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Obtiene el nombre de una cuenta por id */
function accountName(accounts, id) {
  const acc = (accounts || []).find((a) => a.id === id);
  return acc ? acc.name : 'Cuenta eliminada';
}
