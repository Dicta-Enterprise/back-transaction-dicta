import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { WebhookMercadoPagoController } from './Webhook.mercadopago.controller';

const SECRET = 'secreto-del-webhook-de-prueba';
const DATA_ID = 'ORDTST01M5GQSHDPJZ89F1XMJ5SSKS48';
const REQ_ID = 'req-abc';

const firma = (ts = '1792646699', secret = SECRET) =>
  `ts=${ts},v1=${createHmac('sha256', secret).update(`id:${DATA_ID.toLowerCase()};request-id:${REQ_ID};ts:${ts};`).digest('hex')}`;

const evento = (extra: Record<string, unknown> = {}) => ({
  id: 'evt1',
  type: 'order',
  action: 'order.updated',
  date_created: '2026-10-21T00:00:00Z',
  live_mode: false,
  data: { id: DATA_ID },
  ...extra,
});

function crear() {
  const mercadoPago = {
    consultarOrden: jest.fn().mockResolvedValue({ id: DATA_ID, status: 'processing', status_detail: 'in_process' }),
  };
  const pagos = {
    obtenerPagoPorTransactionId: jest.fn().mockResolvedValue({ id: 5, idorden: 77 }),
    actualizarEstadoPorTransactionId: jest.fn().mockResolvedValue({}),
    obtenerPagoPorOrden: jest.fn(),
    obtenerDocumentoTemporal: jest.fn(),
    guardarDatosFactura: jest.fn(),
  };
  const ordenes = { actualizarEstado: jest.fn().mockResolvedValue({}), obtenerOrdenPorId: jest.fn() };
  const facturacion = { emitirSiNoExiste: jest.fn().mockResolvedValue('emitida') };
  const config = { getOrThrow: jest.fn().mockReturnValue(SECRET) };

  const controller = new WebhookMercadoPagoController(
    pagos as never,
    ordenes as never,
    mercadoPago as never,
    config as never,
    facturacion as never,
  );
  return { controller, mercadoPago, pagos, ordenes, facturacion };
}

describe('WebhookMercadoPagoController', () => {
  it('rechaza un evento SIN firma, aunque diga live_mode false (antes se dejaba pasar)', async () => {
    const { controller, mercadoPago } = crear();
    await expect(controller.recibirEvento(evento() as never, undefined as never, REQ_ID)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mercadoPago.consultarOrden).not.toHaveBeenCalled();
  });

  it('rechaza un evento con firma falsa', async () => {
    const { controller, mercadoPago } = crear();
    await expect(controller.recibirEvento(evento() as never, firma('1792646699', 'otro-secreto'), REQ_ID)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(mercadoPago.consultarOrden).not.toHaveBeenCalled();
  });

  it('con firma válida sincroniza el estado desde Mercado Pago y responde received', async () => {
    const { controller, mercadoPago, ordenes, pagos } = crear();
    const r = await controller.recibirEvento(evento() as never, firma(), REQ_ID);
    expect(r).toEqual({ received: true });
    await new Promise((ok) => setImmediate(ok)); // la sincronización corre en segundo plano
    expect(mercadoPago.consultarOrden).toHaveBeenCalledWith(DATA_ID);
    expect(pagos.actualizarEstadoPorTransactionId).toHaveBeenCalledWith(DATA_ID, 'processing');
    expect(ordenes.actualizarEstado).toHaveBeenCalledWith(77, 'processing');
  });

  it('cuando Mercado Pago confirma el pago, factura la orden (sin duplicar: lo decide el servicio de facturación)', async () => {
    const { controller, mercadoPago, facturacion } = crear();
    mercadoPago.consultarOrden.mockResolvedValue({ id: DATA_ID, status: 'processed', status_detail: 'accredited' });
    await controller.recibirEvento(evento() as never, firma(), REQ_ID);
    await new Promise((ok) => setImmediate(ok));
    await new Promise((ok) => setImmediate(ok));
    expect(facturacion.emitirSiNoExiste).toHaveBeenCalledWith(77);
  });

  it('si el pago sigue pendiente no factura', async () => {
    const { controller, facturacion } = crear();
    await controller.recibirEvento(evento() as never, firma(), REQ_ID);
    await new Promise((ok) => setImmediate(ok));
    expect(facturacion.emitirSiNoExiste).not.toHaveBeenCalled();
  });

  it('con firma válida pero un evento que no interesa, lo ignora', async () => {
    const { controller, mercadoPago } = crear();
    const r = await controller.recibirEvento(evento({ action: 'payment.created' }) as never, firma(), REQ_ID);
    expect(r).toEqual({ received: true });
    expect(mercadoPago.consultarOrden).not.toHaveBeenCalled();
  });
});
