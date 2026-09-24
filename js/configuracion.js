/* =========================================================
   configuracion.js — Página de configuración (FinControl)
   ========================================================= */

const showModal = setupConfirmModal();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('clear-all-btn').addEventListener('click', () => {
    showModal({
      title: 'Borrar todos los datos',
      text: 'Se eliminarán TODAS las cuentas, movimientos y la papelera. Esta acción no se puede deshacer. ¿Deseas continuar?',
      okLabel: 'Sí, borrar todo',
      onConfirm: () => {
        clearAllData();
        location.reload();
      },
    });
  });
});
