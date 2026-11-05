// Demostración VISUAL del cobro con Mercado Pago (API de Orders). Abre http://localhost:3999
// Usa el código real de la rama feature/mercadopago-orders-api contra el SANDBOX de Mercado Pago (vendedor y tarjeta de prueba).
// No usa base de datos ni envía correos: el historial vive solo en la memoria de este programa.
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { MercadoPagoService } from '../src/core/services/Order/mercadopago.service';
import { calcularDetalleReal, validarMonto, PrecioInvalidoError, MONEDA_CATALOGO } from '../src/core/services/Order/precio-servidor';
import { mapearEstadoMp } from '../src/core/services/Order/estado-mp';

const PUERTO = 3999;

// --- Credenciales de sandbox (solo del vendedor de PRUEBA)
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

// Catálogo simulado (en producción lo da back-nest: GET /api/cursos/:id)
const catalogo = new Map([['curso-demo', { id: 'curso-demo', nombre: 'Curso de demostración', precio: 10000 }]]);

// El NOMBRE del titular de la tarjeta de prueba decide el resultado
const ESCENARIOS: Record<string, { titular: string; texto: string }> = {
  aprobado: { titular: 'APRO', texto: 'Pago aprobado' },
  rechazado: { titular: 'OTHE', texto: 'Pago rechazado' },
  fondos: { titular: 'FUND', texto: 'Fondos insuficientes' },
};

interface Paso {
  titulo: string;
  detalle: string;
  estado: 'ok' | 'error' | 'info';
}
interface Intento {
  hora: string;
  escenario: string;
  montoCliente: number;
  resultado: string;
  ordenMp: string | null;
}
const historial: Intento[] = [];
let contadorOrden = Date.now() % 100_000_000;

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

async function pagar(escenarioClave: string, montoCliente: number, repetir: boolean) {
  const escenario = ESCENARIOS[escenarioClave] ?? ESCENARIOS.aprobado;
  const pasos: Paso[] = [];
  const terminar = (resultado: string, ordenMp: string | null = null) => {
    historial.unshift({ hora: new Date().toLocaleTimeString('es-CO'), escenario: escenario.texto, montoCliente, resultado, ordenMp });
    return { pasos, resultado };
  };

  // 1) El precio lo decide el servidor
  const { total } = calcularDetalleReal([{ idcurso: 'curso-demo', nombrecurso: 'Nombre inventado por el cliente', precio: montoCliente }], catalogo);
  try {
    validarMonto(montoCliente, total);
    pasos.push({ titulo: '1. El servidor valida el precio', detalle: `El navegador dice ${montoCliente} COP y el catálogo dice ${total} COP: coinciden.`, estado: 'ok' });
  } catch (e) {
    if (!(e instanceof PrecioInvalidoError)) throw e;
    pasos.push({
      titulo: '1. El servidor valida el precio',
      detalle: `El navegador dice ${montoCliente} COP pero el precio real es ${total} COP. Se rechaza ANTES de hablar con Mercado Pago: no se crea orden ni se cobra.`,
      estado: 'error',
    });
    return terminar('Rechazado por precio manipulado');
  }

  // 2) La orden local existe antes de cobrar
  const idorden = ++contadorOrden;
  pasos.push({ titulo: '2. Se guarda la orden local (PENDIENTE)', detalle: `Orden interna ${idorden}. Se guarda antes de cobrar para no cobrar sin dejar rastro.`, estado: 'ok' });

  // 3) Tarjeta de prueba
  const token = await tokenizar(escenario.titular);
  pasos.push({ titulo: '3. Tarjeta de prueba', detalle: `Mastercard de prueba, titular "${escenario.titular}" (el titular decide el resultado en el sandbox).`, estado: 'info' });

  const datos = {
    idorden,
    monto: total,
    emailpagante: 'comprador.prueba@example.com',
    metodopago: 'master',
    tipotarjeta: 'credit_card',
    token,
    cuotas: 1,
    moneda: MONEDA_CATALOGO,
  };

  // 4) Cobro con la API de Orders
  try {
    const orden = await mp.crearOrdenPago(datos);
    const interno = mapearEstadoMp(orden.status);
    pasos.push({
      titulo: '4. Mercado Pago cobra (API de Orders)',
      detalle: `Orden de Mercado Pago ${orden.id}. Estado: ${orden.status}/${orden.status_detail}. Monto: ${orden.total_paid_amount ?? orden.total_amount} COP (sin decimales).`,
      estado: 'ok',
    });
    pasos.push({ titulo: '5. Estado interno de la orden', detalle: `${orden.status} se traduce a ${interno}.`, estado: interno === 'COMPLETADO' ? 'ok' : 'info' });

    if (repetir) {
      const otra = await mp.crearOrdenPago(datos);
      const igual = otra.id === orden.id;
      pasos.push({
        titulo: '6. Se repite la misma compra',
        detalle: igual
          ? `Mercado Pago devolvió la misma orden (${otra.id}): NO se cobró dos veces.`
          : `Se creó otra orden (${otra.id}): habría un doble cobro.`,
        estado: igual ? 'ok' : 'error',
      });
    }

    const consulta = await mp.consultarOrden(orden.id);
    pasos.push({
      titulo: `${repetir ? '7' : '6'}. Consulta posterior (lo que usan el webhook y la revisión cada 5 min)`,
      detalle: `Mercado Pago confirma: ${consulta.status}/${consulta.status_detail} → ${mapearEstadoMp(consulta.status)}.`,
      estado: 'ok',
    });
    return terminar(interno, orden.id);
  } catch (e: any) {
    const r = e?.getResponse?.() ?? {};
    if (r.mpStatus === 'failed') {
      pasos.push({
        titulo: '4. Mercado Pago rechaza el pago',
        detalle: `HTTP ${r.httpStatus}, estado ${r.mpStatus}, motivo: ${r.mpStatusDetail}.`,
        estado: 'error',
      });
      pasos.push({ titulo: '5. Estado interno de la orden', detalle: 'La orden queda FALLIDA, se avisa al comprador y no se entrega el curso.', estado: 'error' });
      return terminar(`Rechazado: ${r.mpStatusDetail}`);
    }
    pasos.push({ titulo: '4. Error al hablar con Mercado Pago', detalle: String(e?.message ?? e), estado: 'error' });
    return terminar('Error de conexión con Mercado Pago');
  }
}

const PAGINA = fs.readFileSync(path.join(__dirname, 'demo-visual.html'), 'utf8');

http
  .createServer(async (req, res) => {
    const json = (codigo: number, cuerpo: unknown) => {
      res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(cuerpo));
    };

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGINA);
      return;
    }
    if (req.method === 'GET' && req.url === '/api/historial') return json(200, historial);
    if (req.method === 'POST' && req.url === '/api/pagar') {
      let cuerpo = '';
      for await (const d of req) cuerpo += d;
      try {
        const { escenario, monto, repetir } = JSON.parse(cuerpo || '{}');
        const montoNum = Number(monto);
        if (!Number.isFinite(montoNum) || montoNum <= 0) return json(400, { error: 'El monto debe ser un número mayor que 0.' });
        return json(200, { ...(await pagar(String(escenario), montoNum, Boolean(repetir))), historial });
      } catch (e: any) {
        return json(500, { error: String(e?.message ?? e) });
      }
    }
    res.writeHead(404).end();
  })
  .listen(PUERTO, () => console.log(`Demostración visual en http://localhost:${PUERTO}`));
