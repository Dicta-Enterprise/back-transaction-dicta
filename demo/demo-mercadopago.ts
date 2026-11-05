// Demostración del flujo de cobro con Mercado Pago (API de Orders) usando el código real de la rama
// feature/mercadopago-orders-api. Usa el SANDBOX de Mercado Pago con un vendedor de prueba (cuenta falsa).
// No usa base de datos ni envía correos: solo muestra lo que decide el servidor y lo que responde Mercado Pago.
//
// Credenciales: archivo demo/.env.sandbox con MP_ACCESS_TOKEN y MP_PUBLIC_KEY del vendedor de PRUEBA (APP_USR-...).
import * as fs from 'fs';
import * as path from 'path';
import { MercadoPagoService } from '../src/core/services/Order/mercadopago.service';
import { calcularDetalleReal, validarMonto, PrecioInvalidoError, MONEDA_CATALOGO } from '../src/core/services/Order/precio-servidor';
import { mapearEstadoMp } from '../src/core/services/Order/estado-mp';

// --- Credenciales de sandbox
const archivo = path.join(__dirname, '.env.sandbox');
if (!fs.existsSync(archivo)) {
  console.error(`Falta ${archivo} con MP_ACCESS_TOKEN y MP_PUBLIC_KEY del vendedor de PRUEBA.`);
  process.exit(1);
}
for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(linea);
  if (m && !linea.trim().startsWith('#')) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.MP_ACCESS_TOKEN?.startsWith('APP_USR-') || !process.env.MP_PUBLIC_KEY?.startsWith('APP_USR-')) {
  console.error('Las credenciales deben ser APP_USR- del vendedor de prueba.');
  process.exit(1);
}

const mp = new MercadoPagoService({ getOrThrow: (k: string) => process.env[k] } as never);

// --- Presentación
const verde = (t: string) => `\x1b[32m${t}\x1b[0m`;
const rojo = (t: string) => `\x1b[31m${t}\x1b[0m`;
const cian = (t: string) => `\x1b[36m${t}\x1b[0m`;
const gris = (t: string) => `\x1b[90m${t}\x1b[0m`;
const titulo = (n: number, t: string) => console.log(`\n${cian(`━━ ${n}. ${t}`)}`);
const pausa = () => new Promise<void>((ok) => setTimeout(ok, 800));

// --- Catálogo simulado (en producción lo da back-nest: GET /api/cursos/:id)
const catalogo = new Map([['curso-demo', { id: 'curso-demo', nombre: 'Curso de demostración', precio: 10000 }]]);

// Tarjeta de prueba de Mercado Pago: el NOMBRE del titular decide el resultado.
//   APRO = aprobar, FUND = fondos insuficientes, OTHE = rechazo general
async function tokenizar(titular: string): Promise<string> {
  const r = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${process.env.MP_PUBLIC_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      card_number: '5254133674403564',
      security_code: '123',
      expiration_month: 11,
      expiration_year: 2030,
      cardholder: { name: titular, identification: { type: 'CC', number: '12345678' } },
    }),
  });
  const j = (await r.json()) as { id?: string };
  if (!j.id) throw new Error(`No se pudo crear el token de la tarjeta de prueba (HTTP ${r.status}).`);
  return j.id;
}

const base = Date.now() % 100_000_000; // órdenes distintas en cada ejecución
let n = 0;
const datos = (token: string, monto: number, idorden: number) => ({
  idorden,
  monto,
  emailpagante: 'comprador.prueba@example.com',
  metodopago: 'master',
  tipotarjeta: 'credit_card',
  token,
  cuotas: 1,
  moneda: MONEDA_CATALOGO,
});

async function cobrar(titular: string, monto: number) {
  const idorden = base + ++n;
  const token = await tokenizar(titular);
  return { idorden, token, intentar: () => mp.crearOrdenPago(datos(token, monto, idorden)) };
}

async function main() {
  console.log(cian('\nDEMO · Cobro con Mercado Pago (API de Orders) · SANDBOX · sin base de datos'));
  console.log(gris('Código real de la rama feature/mercadopago-orders-api; vendedor y tarjeta de prueba.'));

  // 1) El precio lo decide el servidor
  titulo(1, 'El precio lo decide el servidor, no el navegador');
  const pedido = [{ idcurso: 'curso-demo', nombrecurso: 'Nombre inventado por el cliente', precio: 1 }];
  const { detalle, total } = calcularDetalleReal(pedido, catalogo);
  console.log(`El cliente dice: ${rojo('1 peso')}  ·  catálogo: ${verde(String(total) + ' COP')}  ·  nombre real: "${detalle[0].nombrecurso}"`);
  try {
    validarMonto(1, total);
    console.log(rojo('✗ Se aceptó un monto manipulado (esto no debería pasar)'));
  } catch (e) {
    if (!(e instanceof PrecioInvalidoError)) throw e;
    console.log(verde('✓ Rechazado ANTES de hablar con Mercado Pago: ') + (e as Error).message);
  }
  await pausa();

  // 2) Pago aprobado
  titulo(2, 'Pago aprobado (tarjeta de prueba, titular APRO)');
  const ok = await cobrar('APRO', total);
  const a = await ok.intentar();
  console.log(`Orden Mercado Pago: ${a.id}`);
  console.log(`Estado MP: ${a.status}/${a.status_detail}  →  estado interno: ${verde(mapearEstadoMp(a.status))}`);
  console.log(`Monto cobrado: ${a.total_paid_amount ?? a.total_amount} COP (sin decimales, como exige COP)`);
  await pausa();

  // 3) Reintento: no cobra dos veces
  titulo(3, 'Reintento de la misma compra (clave de idempotencia estable)');
  const b = await ok.intentar();
  console.log(`Primera vez: ${a.id}  ·  Reintento: ${b.id}`);
  console.log(a.id === b.id ? verde('✓ Misma orden: Mercado Pago NO cobró dos veces') : rojo('✗ Se creó otra orden'));
  await pausa();

  // 4) Pago rechazado
  titulo(4, 'Pago rechazado (titular OTHE)');
  try {
    await (await cobrar('OTHE', total)).intentar();
    console.log(rojo('✗ Se aprobó un pago que debía rechazarse'));
  } catch (e: any) {
    const r = e.getResponse?.() ?? {};
    console.log(`Mercado Pago respondió HTTP ${r.httpStatus}  ·  estado: ${r.mpStatus}  ·  motivo: ${verde(r.mpStatusDetail)}`);
    console.log(gris('El sistema guarda la orden como FALLIDA y avisa al comprador; no entrega el curso.'));
  }
  await pausa();

  // 5) Fondos insuficientes
  titulo(5, 'Fondos insuficientes (titular FUND)');
  try {
    await (await cobrar('FUND', total)).intentar();
    console.log(rojo('✗ Se aprobó un pago que debía rechazarse'));
  } catch (e: any) {
    const r = e.getResponse?.() ?? {};
    console.log(`Mercado Pago respondió HTTP ${r.httpStatus}  ·  motivo: ${verde(r.mpStatusDetail)}`);
  }
  await pausa();

  // 6) Consulta posterior (lo que usan el webhook y la conciliación)
  titulo(6, 'Consultar el estado real de una orden (webhook y conciliación cada 5 min)');
  const c = await mp.consultarOrden(a.id);
  console.log(`Orden ${c.id}: ${c.status}/${c.status_detail}  →  ${verde(mapearEstadoMp(c.status))}`);

  console.log(cian('\nFin de la demostración. Nada se guardó en la base de datos.\n'));
}

main().catch((e) => {
  console.error(rojo('\nLa demostración falló: ') + (e?.message ?? e));
  process.exit(1);
});
