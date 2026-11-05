# Demostración del cobro con Mercado Pago (sandbox)

Scripts para **ver y probar** el cobro con la API de Orders usando el código real de `src/`, contra el **sandbox** de Mercado Pago (dinero falso).
No usan base de datos, no envían correos y no tocan producción.

## Antes de empezar
1. Crea un vendedor de prueba de Mercado Pago y una aplicación (Checkout API, API Orders). Los pasos están en `docs/INTEGRACION-MERCADOPAGO.md`, sección 7.
2. Copia `demo/.env.sandbox.ejemplo` como `demo/.env.sandbox` y pega la **Public Key** y el **Access Token** (`APP_USR-…`) de ese vendedor de prueba.
   - Ese archivo está en `.gitignore`: no se sube a GitHub.
   - **Nunca** pongas ahí las credenciales reales de Dicta.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run demo` | Corre en la terminal 6 escenarios: precio manipulado, pago aprobado, reintento sin doble cobro, rechazo, fondos insuficientes y consulta posterior |
| `npm run demo:visual` | Enciende una página en `http://localhost:3999` para hacer los pagos a mano y ver cada paso en pantalla. Se apaga con `Ctrl+C` |
| `npm run demo:tarjetas` | Prueba cada tarjeta de prueba y cada nombre de titular (`APRO`, `FUND`, `SECU`…) y muestra el resultado |

En Windows, si PowerShell bloquea `npm`/`npx`, usa `npm.cmd` / `npx.cmd`.

## Cómo ver el resultado dentro de Mercado Pago
Entra (en una ventana de incógnito) con la cuenta del vendedor de prueba → **Actividad** → *Actualizar listado*. Cada pago de la demostración aparece ahí como aprobado o rechazado.

## Notas
- Cada ejecución crea órdenes nuevas en el sandbox. Es normal.
- El precio del catálogo en estas demostraciones es simulado (`Curso de demostración`, 10000 COP); en el servidor real sale de back-nest.
- Los scripts no están incluidos en la compilación del servidor ni en el linter (`tsconfig.build.json` y `.eslintrc.js`).
