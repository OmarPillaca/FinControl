# 💰 FinControl — Gestor de dinero, cuentas y movimientos

Aplicación web **100% frontend** (HTML5 + CSS3 + JavaScript ES6+) para gestionar
dinero, entradas, salidas y cuentas. Sin backend, sin bases de datos y sin
frameworks: los datos se guardan en **localStorage** del navegador.

## 🚀 Cómo ejecutarla

1. Abre la carpeta del proyecto en **Visual Studio Code**.
2. Instala la extensión **Live Server** (ritwickdey.LiveServer).
3. Clic derecho sobre `index.html` → **"Open with Live Server"**.
4. Se abrirá en el navegador (por defecto `http://127.0.0.1:5500`).

> También puedes abrir `index.html` directamente con doble clic, aunque se
> recomienda Live Server.

## 🗂️ Estructura del proyecto

```text
/index.html          → Inicio: total general, mini-totales, cuentas y últimos movimientos
/cuentas.html        → Gestión de cuentas y tarjetas, transferencias entre cuentas y categorías por cuenta
/entradas.html       → Registro de entradas de dinero
/salidas.html        → Registro de salidas/gastos (descripción opcional)
/movimientos.html    → Historial completo con filtros
/papelera.html       → Elementos eliminados: restaurar o borrar definitivo
/configuracion.html  → Tema, configuración de la billetera, información y borrado total de datos
/css/                → Estilos (base + uno por página)
/js/                 → Lógica (uno por página + capas compartidas)
/assets/             → Reservado para iconos e imágenes propias
```

## 🧠 Arquitectura JS

| Archivo | Responsabilidad |
|---|---|
| `js/utils.js` | Formato de moneda/fechas, IDs, totales, validaciones, constantes |
| `js/storage.js` | **Capa de almacenamiento independiente** (localStorage). Guardar/leer/actualizar/eliminar/restaurar/limpiar |
| `js/theme.js` | Modo claro/oscuro persistente |
| `js/nav.js` | Navegación lateral (desktop) e inferior (móvil) |
| `js/shared.js` | Renders comunes y modal de confirmación |
| `js/categorias.js` | **Nuevo.** Gestor de categorías personalizadas (crear / editar / eliminar) por cuenta |
| `js/transferencias.js` | **Nuevo.** Formulario y lista de transferencias entre cuentas |
| `js/<página>.js` | Lógica específica de cada página |

Gracias a la capa `storage.js`, migrar a una API o base de datos real en el
futuro solo requiere reemplazar ese archivo manteniendo las mismas funciones.

## ✨ Funcionalidades

- Total general = cuentas activas + billetera (solo si está visible e incluida).
- Mini-totales: efectivo, tarjetas, entradas y salidas.
- Cuentas ilimitadas: Efectivo / Tarjeta / Billetera, con estado y notas.
- Tarjetas: últimos 4 dígitos, límite de crédito, monto utilizado y barra de uso.
- Entradas y salidas con **categorías personalizadas por cuenta** (las clásicas vienen
  precargadas y se pueden editar o eliminar). Descripción **opcional**.
- Los saldos se actualizan solos al crear, eliminar o restaurar movimientos.
- Papelera: eliminar → restaurar → eliminar definitivo → vaciar papelera (con confirmación).
- Historial unificado (todas las cuentas + billetera) con filtros por tipo y por
  cuenta: todas · solo billetera · una cuenta específica. Cada fila muestra tipo,
  categoría, cuenta, fecha e importe.
- **Transferencias entre cuentas**: restan del origen y suman al destino, quedan en el
  historial y se revierten/restauran correctamente desde la papelera.
- **Billetera independiente del efectivo**: se puede mostrar u ocultar, y (si es
  visible) incluir o excluir del monto total, desde su tarjeta del panel o desde
  Configuración. La preferencia se recuerda entre sesiones.
- Modo claro/oscuro con persistencia.
- Diseño responsive: menú lateral en PC y barra inferior en celular.
- Validaciones con mensajes claros; los datos nunca salen del navegador.

## 🔒 Seguridad

No se guardan contraseñas, CVV ni números completos de tarjetas. Solo datos
de identificación básica (nombre y últimos 4 dígitos, opcionales).

## 🆕 Datos nuevos en localStorage

| Clave / campo | Contenido |
|---|---|
| `fincontrol_wallet_settings` | `{ visible, includeInTotal }` de la billetera (por defecto ambos `true`) |
| `account.categories` | `{ income: [...], expense: [...] }` con `{ id, label, icon }` por cuenta |
| movimiento `type: 'transfer'` | `accountId` (origen) + `toAccountId` (destino) |

Las cuentas creadas antes de esta versión se migran solas al abrir la app
(reciben las categorías predeterminadas) y nada de lo guardado se pierde.
