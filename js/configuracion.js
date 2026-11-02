/* =========================================================
   configuracion.js — Página de configuración (FinControl)
   ========================================================= */

const showModal = setupConfirmModal();

document.addEventListener('DOMContentLoaded', () => {
  bindWalletSettings(); // [NUEVO]
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    showModal({
      title: 'Borrar todos los datos',
      text: 'Se eliminarán TODAS las cuentas, categorías, la configuración de la billetera, los movimientos y la papelera. Esta acción no se puede deshacer. ¿Deseas continuar?',
      okLabel: 'Sí, borrar todo',
      onConfirm: () => {
        clearAllData();
        location.reload();
      },
    });
  });
});

/* =========================================================
   [NUEVO] Configuración de la billetera
   - "Visible": se muestra (o no) en el panel principal.
   - "Incluir en el total": solo tiene efecto si es visible.
   Ambos valores se guardan y se recuerdan entre sesiones.
   ========================================================= */
function bindWalletSettings() {
  document.getElementById('wallet-visible-switch').addEventListener('click', () => {
    setWalletSettings({ visible: !getWalletSettings().visible });
    renderWalletSettings();
  });
  document.getElementById('wallet-include-switch').addEventListener('click', () => {
    if (!getWalletSettings().visible) return; // deshabilitado mientras esté oculta
    setWalletSettings({ includeInTotal: !getWalletSettings().includeInTotal });
    renderWalletSettings();
  });
  renderWalletSettings();
}

function renderWalletSettings() {
  const ws = getWalletSettings();

  const visSwitch = document.getElementById('wallet-visible-switch');
  visSwitch.classList.toggle('on', ws.visible);
  visSwitch.setAttribute('aria-checked', String(ws.visible));
  document.getElementById('wallet-visible-state').textContent = ws.visible ? 'Visible' : 'Oculta';

  const incSwitch = document.getElementById('wallet-include-switch');
  incSwitch.classList.toggle('on', ws.includeInTotal);
  incSwitch.setAttribute('aria-checked', String(ws.includeInTotal));
  incSwitch.disabled = !ws.visible;
  document.getElementById('wallet-include-item').classList.toggle('is-disabled', !ws.visible);
  document.getElementById('wallet-include-state').textContent = ws.includeInTotal ? 'Incluida' : 'Excluida';
  document.getElementById('wallet-include-note').textContent = ws.visible
    ? 'Suma el saldo de la billetera al monto global o mantenlo por separado.'
    : 'No aplica mientras la billetera esté oculta: una billetera oculta nunca se suma al total.';
}
