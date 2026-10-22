import { createHmac } from 'crypto';
import { verificarFirmaMp } from './firma-webhook';

const secret = 'secreto-de-prueba-del-webhook';

const firmar = (manifiesto: string, clave = secret) => createHmac('sha256', clave).update(manifiesto).digest('hex');

describe('verificarFirmaMp', () => {
  const ts = '1792636931';
  const requestId = 'req-123';
  const dataId = 'ORDTST01M5GQSHDPJZ89F1XMJ5SSKS48';

  it('acepta una firma correcta calculada con el id en minúsculas (como lo pide Mercado Pago)', () => {
    const v1 = firmar(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`);
    expect(verificarFirmaMp({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secret })).toBe(true);
  });

  it('también acepta la firma calculada con el id tal cual llegó', () => {
    const v1 = firmar(`id:${dataId};request-id:${requestId};ts:${ts};`);
    expect(verificarFirmaMp({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secret })).toBe(true);
  });

  it('rechaza si falta el encabezado de firma (antes se dejaba pasar)', () => {
    expect(verificarFirmaMp({ xSignature: undefined, xRequestId: requestId, dataId, secret })).toBe(false);
    expect(verificarFirmaMp({ xSignature: '', xRequestId: requestId, dataId, secret })).toBe(false);
  });

  it('rechaza una firma hecha con otro secreto', () => {
    const v1 = firmar(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`, 'otro-secreto');
    expect(verificarFirmaMp({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secret })).toBe(false);
  });

  it('rechaza si cambian el id, el request-id o la fecha', () => {
    const v1 = firmar(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`);
    const firma = `ts=${ts},v1=${v1}`;
    expect(verificarFirmaMp({ xSignature: firma, xRequestId: requestId, dataId: 'ORDTSTOTRAORDEN', secret })).toBe(false);
    expect(verificarFirmaMp({ xSignature: firma, xRequestId: 'otro', dataId, secret })).toBe(false);
    expect(verificarFirmaMp({ xSignature: `ts=999,v1=${v1}`, xRequestId: requestId, dataId, secret })).toBe(false);
  });

  it('rechaza formatos rotos sin lanzar errores', () => {
    for (const mala of ['basura', 'ts=1', 'v1=abc', 'ts=1,v1=zzzz', 'ts=1,v1=']) {
      expect(verificarFirmaMp({ xSignature: mala, xRequestId: requestId, dataId, secret })).toBe(false);
    }
  });

  it('sin secreto configurado nunca valida', () => {
    const v1 = firmar(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`);
    expect(verificarFirmaMp({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secret: '' })).toBe(false);
  });

  it('omite las partes que no llegaron al armar el texto firmado', () => {
    const v1 = firmar(`ts:${ts};`);
    expect(verificarFirmaMp({ xSignature: `ts=${ts},v1=${v1}`, secret })).toBe(true);
  });
});
