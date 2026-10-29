# Integración con Mercado Pago (API de Orders) – Guía de continuidad

Esta guía es para quien llega nuevo al proyecto y necesita **entender cómo se cobra en Mundo Dictariano y poder seguir el trabajo**.
No hace falta conocer nada previo: primero se explica qué es cada cosa, luego cómo se hace y al final qué falta por hacer.

- **Servicio:** `back-transaction`
- **Autor del arreglo:** David Esteban Forero Palomino (proyecto de prácticas profesionales, Anexo 3)
- **Última actualización:** 29/10/2026
- **PR del cobro:** #42 (`feature/mercadopago-orders-api`). **PR de lo relacionado con el panel:** #43, #89, #90 y #77 (ver la sección 16).
- Hay una versión con capturas de pantalla en el Drive del equipo.

---

## 0. Cómo leer esta guía y glosario

| Término | Qué significa |
|---|---|
| **Sandbox / pruebas** | El entorno de Mercado Pago donde el dinero es falso. Todo lo de esta guía se probó ahí. |
| **Producción** | El entorno real, con dinero real y la cuenta real de Dicta. |
| **Access Token** | Llave **secreta** del servidor para hablar con Mercado Pago. Nunca va en el frontend ni en GitHub. |
| **Public Key** | Llave **pública**. El navegador la usa para convertir la tarjeta en un token de un solo uso. |
| **Token de tarjeta** | Código de un solo uso que reemplaza el número de la tarjeta; así el número nunca pasa por nuestro servidor. |
| **API de Orders** | La forma actual de Mercado Pago para pedir un cobro (`POST /v1/orders`). |
| **Idempotencia** | Garantía de que repetir la misma petición no cobra dos veces. Se logra con una clave única por compra. |
| **Webhook** | Aviso automático que Mercado Pago le manda a nuestro servidor cuando cambia el estado de un pago. |
| **Firma del webhook** | Sello secreto que prueba que el aviso viene de Mercado Pago y no de alguien falso. |
| **Conciliación** | Revisión automática (cada 5 minutos) de las compras que quedaron pendientes, preguntándole a Mercado Pago cómo terminaron. |
| **Factus** | Servicio que emite la factura electrónica (DIAN) de cada compra. |
| **PR (pull request)** | Petición de unir una rama a la rama principal; alguien más la revisa antes. |

---

## 1. Resumen

Se revisó el flujo de compra de back-transaction y se corrigieron siete problemas que permitían cobrar un precio manipulado, cobrar dos veces, dejar compras sin registro o aceptar avisos falsos.
Ahora el precio lo decide el servidor, el cobro usa la API de Orders con protección contra el doble cobro, el webhook exige firma y las compras que quedan en el aire se revisan solas cada 5 minutos.
Todo se probó con 91 pruebas automáticas y con el sandbox de Mercado Pago y de Factus, sin dinero real.

---

## 2. Mapa del sistema

```
 Cliente (navegador)
   │  1. el SDK de Mercado Pago convierte la tarjeta en un token
   ▼
 Sitio de Dicta (frontend) ──────────────► back-transaction  POST /api/orders
                                              │   ├─► back-nest   (precio real del curso)
                                              │   ├─► back-auth   (datos del usuario)
                                              │   ├─► Mercado Pago (cobro, API de Orders)
                                              │   ├─► Factus      (factura electrónica)
                                              │   └─► Brevo       (correo de confirmación)
 Mercado Pago ──── webhook firmado ─────────►│  POST /api/webhooks/mercadopago
```

| Pieza | Qué hace | Tecnología y puerto local |
|---|---|---|
| **Sitio de Dicta** (frontend) | Formulario de pago; genera el token de la tarjeta y lo envía | Repo `plataforma-universo-dictariano` |
| **back-transaction** | Órdenes, pagos, facturas, webhook y conciliación | NestJS, Prisma, Postgres (esquema `transaction`), 3001 |
| **back-nest** | Catálogo de cursos (de ahí sale el precio real), LMS y API del panel | NestJS, Mongo, 3000 |
| **back-auth** | Usuarios, familias y login (cookie `accessToken`, dura 60 minutos) | NestJS, Postgres (esquema `auth`), 3002 |
| **Panel de administración** | Pantallas de administración | Angular, 4200 (repo `plataforma-admin-dicta`) |

- La **base de datos es compartida** (Neon) y tiene un esquema por servicio.
- Entre los tres servicios se usa una **clave interna** (cabecera `x-internal-api-key`, variable `INTERNAL_API_KEY`), que debe ser igual en los tres.

---

## 3. Situación inicial: los siete problemas que se corrigieron

| Problema | Dónde estaba (master anterior) | Consecuencia |
|---|---|---|
| Cobraba con la API vieja de pagos (`/v1/payments`) y leía la respuesta como si fuera de Orders | `mercadopago.service.ts` | Mezcla de dos APIs |
| La clave de idempotencia era nueva en cada llamada | `mercadopago.service.ts` | Un reintento podía cobrar dos veces |
| El precio lo mandaba el cliente y el servidor solo comparaba datos del mismo cliente | `create-order.usecase.ts` | Se podía pagar 1 peso |
| La orden se cobraba antes de guardarse | flujo de `create-order` | Plata cobrada sin registro |
| El webhook se saltaba la verificación de firma si el aviso decía `live_mode: false` | `Webhook.mercadopago.controller.ts` | Cualquiera podía falsificar un aviso |
| La factura llevaba `Date.now()` en su referencia | `emitir-factura-electronica.usecase.ts` | Facturas duplicadas |
| Las compras pendientes no se revisaban | no había proceso | Compras en el aire para siempre |

---

## 4. El flujo de compra (cómo funciona hoy)

1. El servidor **valida el precio** contra el catálogo de cursos de back-nest. Se ignora el precio y el nombre que mande el navegador. Si el monto no coincide, se rechaza **sin crear orden ni cobrar**.
2. Se **guarda la orden** como `PENDIENTE` antes de cobrar. Su id identifica el intento.
3. Se **cobra con la API de Orders** (`POST /v1/orders`), con la clave de idempotencia `orden-<id>` y el monto en pesos enteros.
4. Se **registra el pago** y se actualiza el estado de la orden (`COMPLETADO`, `FALLIDO`, `PENDIENTE`…).
5. Si se aprobó: se **emite la factura electrónica** (sin duplicar) y se **envía el correo** de confirmación.
6. Se guarda **dónde se compró** (país, ciudad y zona horaria; la IP no se guarda) — PR #43.
7. **Después**, por otros caminos:
   - El **webhook** de Mercado Pago llega firmado; se verifica, se consulta el estado real y se actualiza la compra.
   - La **conciliación** revisa cada 5 minutos las órdenes `PENDIENTE` con pago asociado y le pregunta a Mercado Pago cómo terminaron. Avisa al comprador solo la primera vez que se aprueba.

Estados: `processed` → `COMPLETADO`; `failed`/`rejected` → `FALLIDO`; `canceled`/`expired` → `CANCELADO`; `refunded` → `DEVUELTO`; `charged_back` → `CONTRACARGO`; cualquier otro (por ejemplo `processing`) → `PENDIENTE`.

---

## 5. Componentes del código

Todo está en `src/core/services/Order/` salvo lo indicado.

| Archivo | Para qué sirve |
|---|---|
| `precio-servidor.ts` | Calcula el precio real y valida el monto que dice el cliente |
| `mp-orders.ts` | Arma el cuerpo de la orden, la clave de idempotencia y lee los errores de Mercado Pago |
| `estado-mp.ts` | Traduce los estados de Mercado Pago a los internos |
| `firma-webhook.ts` | Verifica la firma del webhook |
| `mercadopago.service.ts` | Cobra y consulta órdenes en Mercado Pago |
| `post-pago.service.ts` | Lo que ocurre tras un pago aprobado (correo, factura) |
| `sincronizacion-pagos.service.ts` | Actualiza una compra con el estado real (lo usan el webhook y la conciliación) |
| `conciliacion-pagos.service.ts` | Revisa las órdenes pendientes |
| `src/core/services/curso/curso-api.service.ts` | Pide el precio real a back-nest |
| `src/core/services/Facturacion/` | Factura electrónica sin duplicados (`facturacion.service.ts`, `factus.service.ts`) |
| `src/application/uses-cases/Order/create-order.usecase.ts` | Orquesta todo el flujo de la sección 4 |
| `src/infraestructure/http/Order/` | Endpoint `POST /api/orders` y el programa de conciliación cada 5 minutos |
| `src/infraestructure/http/Webhook/` | Endpoint `POST /api/webhooks/mercadopago` |

---

## 6. Configuración (variables de entorno)

Copia `.env_template` a `.env` y pide los valores al equipo. **El `.env` nunca se sube a GitHub.**

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | Base de datos; debe terminar en `?schema=transaction` |
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago |
| `MP_webhook_TOKEN` | Secreto con el que Mercado Pago firma los avisos |
| `CURSO_API_URL` | Dirección de back-nest, de donde se toma el precio real |
| `AUTH_API_URL` | Dirección de back-auth |
| `INTERNAL_API_KEY` | Clave interna entre servicios (igual en los tres) |
| `CONCILIACION_PAGOS_ACTIVA` | `true` por defecto; `false` apaga la revisión de las órdenes pendientes |
| `FACTUS_BASE_URL` | Opcional; por defecto el sandbox de Factus |

La lista completa (correos con Brevo, Factus, etc.) está en `.env_template`.

> **Importante:** para desarrollar **no uses los valores de Mercado Pago que traiga la plantilla**. Usa las credenciales de un vendedor de prueba (sección 7).

---

## 7. Puesta en marcha local

1. `npm install` y `npx prisma generate`.
2. Crea el **vendedor de prueba** de Mercado Pago:
   - Panel de desarrolladores → **Cuentas de prueba** → crear una cuenta de tipo vendedor.
   - Entra con esa cuenta en una **ventana de incógnito** (así no se mezcla con tu cuenta real), crea una **aplicación** con producto **Checkout API** y la **API Orders**.
   - En **Credenciales de producción** de esa cuenta falsa copia la **Public Key** y el **Access Token** (empiezan con `APP_USR-`). Son para desarrollo; el dinero es falso.
3. Completa tu `.env` con esas credenciales y con las direcciones de los otros servicios.
4. Enciende **back-auth** y **back-nest** (hacen falta para el usuario y el precio) y luego `npm run start:dev`. Swagger queda en `http://localhost:3001/api/swagger`.
5. Modo **demostración** (`npm run start:demo`): solo expone lo interno de compras, en lectura, sin correos ni procesos programados.
6. En **Windows**, si PowerShell bloquea `npx` con un error de "ejecución de scripts deshabilitada", usa `npx.cmd`.

> La base de datos es **compartida con el resto del equipo**. No hagas pruebas que escriban órdenes con usuarios reales: se enviarían correos y facturas.

---

## 8. Cómo probar

### 8.1 Pruebas automáticas
```bash
npm test
```
Deben pasar 14 archivos y 91 pruebas. No usan internet, base de datos ni Mercado Pago.

### 8.2 Demostración (sandbox, sin base de datos ni correos)
Necesita el archivo `demo/.env.sandbox` (copia `demo/.env.sandbox.ejemplo` y pega las credenciales del vendedor de prueba; ese archivo no se sube a GitHub).

| Comando | Qué hace |
|---|---|
| `npm run demo` | Corre en la terminal los 6 escenarios: precio manipulado, aprobado, reintento, rechazado, sin fondos y consulta posterior |
| `npm run demo:visual` | Enciende una página en `http://localhost:3999` para hacer los pagos a mano y ver cada paso |
| `npm run demo:tarjetas` | Prueba cada tarjeta de prueba y cada nombre de titular y muestra el resultado |

### 8.3 Dónde ver el resultado en Mercado Pago
Entra (en incógnito) con la cuenta del vendedor de prueba → **Actividad** → *Actualizar listado*. Ahí aparecen las ventas aprobadas y rechazadas que crearon las pruebas.

### 8.4 Tarjetas de prueba (verificadas en sandbox)
Fecha de vencimiento: cualquiera futura. Documento: `123456789` o similar.

| Tarjeta | Resultado con titular `APRO` |
|---|---|
| Visa crédito `4242 4242 4242 4242` | Aprobada |
| Mastercard crédito `5254 1336 7440 3564` | Aprobada |
| American Express `3777 0000 0000 000` (CVV `1234`) | Aprobada |
| `5108 0000 0000 0000` | Es una **tarjeta débito**: se aprueba enviada como `debmaster` / `debit_card`; como crédito falla (`payment_method_not_allowed_for_collector`) |
| Visa débito `4915 1120 5524 6507` | **No se logró aprobar** con el vendedor de prueba (error 422 sin detalle); puede comportarse distinto con la cuenta de Dicta |

El **nombre del titular** decide el resultado:

| Titular | Resultado |
|---|---|
| `APRO` | Aprobado |
| `SURE`, `PEND`, `OTHE` | Rechazo general (`rejected_by_issuer`) |
| `SECU`, `EXPI` | Datos de tarjeta incorrectos (`bad_filled_card_data`; no se distinguen entre sí) |
| `CALL` | Requiere llamar al banco (`required_call_for_authorize`) |
| `FUND` | Fondos insuficientes (`insufficient_amount`) |
| `CONT` | En proceso (`processing` / `in_process`); el servidor responde 202 |

### 8.5 Con Swagger o Postman
1. Genera el **token de la tarjeta** (de un solo uso) con la Public Key:
   ```bash
   curl -X POST "https://api.mercadopago.com/v1/card_tokens?public_key=TU_PUBLIC_KEY" \
     -H "Content-Type: application/json" \
     -d '{"card_number":"5254133674403564","security_code":"123","expiration_month":11,"expiration_year":2030,"cardholder":{"name":"APRO","identification":{"type":"CC","number":"12345678"}}}'
   ```
2. Envía `POST /api/orders` con ese token. El cuerpo sigue `CrearVentaDto` (`src/application/dto/Order/create-orden.dto.ts`): `idusuario`, `aceptoTerminos`, `detalleOrden` (curso y precio) y `pago` (monto, `moneda: "COP"`, `metodopago`, `tipotarjeta`, `token`, `cuotas`, nombre y correo del pagador).
3. Los precios y nombres del cuerpo **no cuentan**: el servidor usa los del catálogo de back-nest.

---

## 9. Códigos de error: cambian con la API de Orders

El endpoint devuelve al frontend `mpStatusDetail`. Con Orders los códigos **no son los de la API vieja**:

| API vieja (`/v1/payments`) | API de Orders (lo que devuelve hoy) |
|---|---|
| `cc_rejected_other_reason` | `rejected_by_issuer` |
| `cc_rejected_insufficient_amount` | `insufficient_amount` |
| `cc_rejected_call_for_authorize` | `required_call_for_authorize` |
| `cc_rejected_bad_filled_security_code` y `cc_rejected_bad_filled_date` | `bad_filled_card_data` (una sola) |
| `pending_contingency` | `in_process` |

**Pendiente:** confirmar con el frontend si muestra mensajes según el código. Si es así, lo más sencillo es **traducir en el servidor** los códigos de Orders a los viejos, para no tocar el frontend.

---

## 10. Decisiones de diseño y por qué

- **El precio se decide en el servidor:** el navegador no es de fiar.
- **La orden se guarda antes de cobrar:** si algo falla a la mitad, no queda plata cobrada sin registro.
- **Clave de idempotencia `orden-<id>`:** un reintento devuelve la misma orden en lugar de cobrar otra vez.
- **Monto en pesos enteros** (`"10000"`, no `"10000.00"`): así lo exige COP en Mercado Pago.
- **La firma del webhook es siempre obligatoria**, incluso en pruebas.
- **Factura con referencia estable** `ORD-<orden>-PAG-<pago>`: Factus devuelve la misma factura si se repite.
- **Conciliación cada 5 minutos**, sobre órdenes de entre 5 minutos y 3 días de antigüedad, máximo 50 por vuelta; se apaga con `CONCILIACION_PAGOS_ACTIVA=false`.
- **No se guarda la IP**, solo país, ciudad y zona horaria (privacidad).
- **Si algo accesorio falla** (ubicación, correo, factura), no se tumba una compra ya cobrada.

---

## 11. Trampas y cosas no obvias

- **Credenciales `TEST-`:** el 21/10/2026 las de la aplicación de Dicta dieron **401** con `POST /v1/orders`; por eso se usan las `APP_USR-` de un vendedor de prueba. Conviene volver a verificarlo.
- **Base compartida con esquemas:** las compras viven en el esquema `transaction`. El SQL manual debe calificarse: `"transaction"."orden"`.
- **Migraciones fuera del repo:** la base tiene migraciones aplicadas (`add_ip_orden` y un segundo `init`) que no están en `prisma/migrations`. Cuidado con `prisma migrate dev`.
- **Columna `orden.ip`:** existe en la base pero está vacía y no se usa; se declaró en el esquema para que un `db push` no la borre.
- **Órdenes de prueba antiguas:** hay unas 73 órdenes `PENDIENTE` en la base compartida, de pruebas anteriores.
- **La tarjeta `5108…` es débito**, aunque alguna tabla diga crédito.
- **Los códigos de error cambian** con Orders (sección 9).
- **PowerShell** puede bloquear `npx`: usa `npx.cmd`.
- **Nunca** subas un `.env` ni pegues un token en un chat o documento.

---

## 12. Qué no se probó y limitaciones

- El **webhook con un aviso real** de Mercado Pago: está probado con pruebas automáticas, pero no con un evento real (hace falta una dirección pública, por ejemplo con ngrok, y el secreto de la aplicación).
- Los **datos de impuestos de la factura** (`tribute_id`, exclusión de IVA) están pendientes de confirmar con el contador.
- **Producción:** por indicación de Carlos no se hicieron pruebas con dinero real.
- La ubicación sale de `geoip-lite` (aproximada) y `x-forwarded-for` puede falsificarse: es un dato informativo, no de seguridad.

---

## 13. Lista de verificación para producción

1. Desplegar con las credenciales de producción de Dicta, `CURSO_API_URL` y la clave interna.
2. Confirmar que la **aplicación real** de Mercado Pago tiene habilitada la **API de Orders**.
3. Configurar en el panel de Mercado Pago la **dirección del webhook** y su secreto.
4. Confirmar con el contador los datos de impuestos de la factura.
5. Hacer una **primera compra controlada** con el flujo completo.
6. Revisar las órdenes pendientes antiguas.
7. Verificar que el frontend envía correctamente `metodopago` y `tipotarjeta`.

---

## 14. Qué sigue (pendientes para quien continúe)

1. Que se **unan** los PR #42 y #43 (y los demás de la sección 16).
2. **Probar el webhook real** con un túnel público.
3. **Traducir los códigos de error** si el frontend los usa (sección 9).
4. **Verificar si las credenciales `TEST-` de la aplicación de Dicta funcionan con Orders.**
5. Confirmar los **datos de impuestos** de la factura.
6. **Revisar las órdenes pendientes antiguas** de la base compartida.
7. Completar el **checklist de producción** (sección 13).

---

## 15. Extensiones relacionadas (panel de administración)

- **Ubicación de cada compra** (país, ciudad y zona horaria) y **detalle de compras** de un usuario: en la tabla de Usuarios, un ícono junto a "Compró" abre en una pestaña nueva el detalle (fecha y hora, lugar, resultado, monto y curso). Las compras anteriores salen "Sin dato".
- **Columna "Tipo de usuario"**: Premium si ya compró, Free si no; un niño o joven toma el tipo de su familia.

---

## 16. Mapa de PR y ramas

| PR | Repositorio | Rama | Qué trae |
|---|---|---|---|
| #42 | back-transaction | `feature/mercadopago-orders-api` | El arreglo del cobro (esta guía) |
| #43 | back-transaction | `feature/ubicacion-compra-back-transaction` | Ubicación de la compra, detalle de compras, demostración, `npm test` corregido |
| #89 | back-auth | `feature/usuarios-admin-back-auth` | Familias, usuarios de administración, UUID y códigos legibles |
| #90 | back-auth | `feature/geolocalizar-interno-back-auth` | Endpoint interno para ubicar una IP |
| #77 | back-nest | `feature/detalle-compras-admin-back-nest` | LMS, administración de usuarios, detalle de compras y tipo de usuario |
| – | plataforma-admin-dicta | (parche) | Ícono de detalle y columna de tipo en el panel |
