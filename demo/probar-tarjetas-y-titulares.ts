// Comprueba, contra el SANDBOX de Mercado Pago y con el vendedor de PRUEBA de demo/.env.sandbox, qué resultado da cada
// tarjeta de prueba y cada nombre de titular (APRO, FUND, SECU...). No usa base de datos ni correos.
// Cada fila crea una orden de prueba en la cuenta del vendedor de prueba.
import * as fs from 'fs';
import * as path from 'path';
import { MercadoPagoService } from '../src/core/services/Order/mercadopago.service';

for (const linea of fs.readFileSync(path.join(__dirname, '.env.sandbox'), 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(linea);
  if (m && !linea.trim().startsWith('#')) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const mp = new MercadoPagoService({ getOrThrow: (k: string) => process.env[k] } as never);

async function token(numero: string, cvv: string, titular: string): Promise<string | null> {
  const r = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${process.env.MP_PUBLIC_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      card_number: numero.replace(/\s/g, ''),
      security_code: cvv,
      expiration_month: 11,
      expiration_year: 2030,
      cardholder: { name: titular, identification: { type: 'CC', number: '123456789' } },
    }),
  });
  const j = (await r.json()) as { id?: string; message?: string; cause?: { description?: string }[] };
  return j.id ?? `ERROR token (HTTP ${r.status}): ${j.cause?.[0]?.description ?? j.message ?? 'sin detalle'}`;
}

let n = Date.now() % 100_000_000;
async function cobrar(metodo: string, tipo: string, numero: string, cvv: string, titular: string): Promise<string> {
  const t = await token(numero, cvv, titular);
  if (!t || t.startsWith('ERROR')) return t ?? 'sin token';
  try {
    const o = await mp.crearOrdenPago({
      idorden: ++n,
      monto: 10000,
      emailpagante: 'comprador.prueba@example.com',
      metodopago: metodo,
      tipotarjeta: tipo,
      token: t,
      cuotas: 1,
      moneda: 'COP',
    });
    return `${o.status}/${o.status_detail}`;
  } catch (e: any) {
    const r = e?.getResponse?.() ?? {};
    return `HTTP ${r.httpStatus ?? '?'} ${r.mpStatus ?? 'error'}: ${r.mpStatusDetail ?? e?.message}`;
  }
}

async function main() {
  console.log('\n== TARJETAS DE PRUEBA (con titular APRO) ==');
  const tarjetas: [string, string, string, string, string, string][] = [
    ['VISA crédito 4242 4242 4242 4242 (titular "APRO TEST")', 'visa', 'credit_card', '4242424242424242', '123', 'APRO TEST'],
    ['VISA crédito 4242 4242 4242 4242 (titular "APRO")', 'visa', 'credit_card', '4242424242424242', '123', 'APRO'],
    ['MASTER crédito 5108 0000 0000 0000', 'master', 'credit_card', '5108000000000000', '123', 'APRO'],
    ['AMEX crédito 3777 0000 0000 000', 'amex', 'credit_card', '377700000000000', '1234', 'APRO'],
    ['VISA débito 4915 1120 5524 6507', 'debvisa', 'debit_card', '4915112055246507', '123', 'APRO'],
    ['(referencia) MASTER crédito 5254 1336 7440 3564 - la de nuestra demostración', 'master', 'credit_card', '5254133674403564', '123', 'APRO'],
  ];
  for (const [nombre, metodo, tipo, num, cvv, titular] of tarjetas) console.log(`${nombre.padEnd(82)} -> ${await cobrar(metodo, tipo, num, cvv, titular)}`);

  console.log('\n== NOMBRES DE TITULAR (con la Mastercard de prueba 5254...) ==');
  const nombres: [string, string][] = [
    ['SURE', 'rechazo general'], ['SECU', 'CVC incorrecto'], ['EXPI', 'fecha incorrecta'], ['CALL', 'requiere autorización'],
    ['FUND', 'fondos insuficientes'], ['PEND', 'no procesado'], ['CONT', 'en proceso'], ['OTHE', '(referencia) el que usa nuestra demostración'],
  ];
  for (const [titular, descripcion] of nombres) console.log(`${(titular + ' (' + descripcion + ')').padEnd(60)} -> ${await cobrar('master', 'credit_card', '5254133674403564', '123', titular)}`);
}

main().catch((e) => {
  console.error('ERROR:', e?.message ?? e);
  process.exit(1);
});
