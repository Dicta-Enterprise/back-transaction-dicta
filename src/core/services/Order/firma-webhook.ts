import { createHmac, timingSafeEqual } from 'crypto';

export interface DatosFirmaMp {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
  secret: string;
}

function iguales(hexA: string, hexB: string): boolean {
  try {
    const a = Buffer.from(hexA, 'hex');
    const b = Buffer.from(hexB, 'hex');
    return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verifica la firma que Mercado Pago agrega a cada notificación (encabezado x-signature = "ts=...,v1=...").
 * Falta de firma, formato roto o firma distinta => false. Nunca se omite la verificación.
 *
 * El texto firmado es "id:<id>;request-id:<x-request-id>;ts:<ts>;" y las partes ausentes se omiten.
 * Mercado Pago pide el id en minúsculas cuando es alfanumérico, así que se acepta cualquiera de las dos formas.
 */
export function verificarFirmaMp({ xSignature, xRequestId, dataId, secret }: DatosFirmaMp): boolean {
  if (!xSignature || !secret) return false;

  const partes: Record<string, string> = {};
  for (const trozo of xSignature.split(',')) {
    const i = trozo.indexOf('=');
    if (i > 0) partes[trozo.slice(0, i).trim()] = trozo.slice(i + 1).trim();
  }

  const { ts, v1 } = partes;
  if (!ts || !v1) return false;

  const candidatos = dataId ? [...new Set([dataId, dataId.toLowerCase()])] : [undefined];

  return candidatos.some((id) => {
    const manifiesto = `${id ? `id:${id};` : ''}${xRequestId ? `request-id:${xRequestId};` : ''}ts:${ts};`;
    return iguales(v1, createHmac('sha256', secret).update(manifiesto).digest('hex'));
  });
}
