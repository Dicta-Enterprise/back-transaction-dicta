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

function crear(sincronizar: jest.Mock = jest.fn().mockResolvedValue('actualizada')) {
  const sincronizacion = { sincronizar };
  const config = { getOrThrow: jest.fn().mockReturnValue(SECRET) };
  const controller = new WebhookMercadoPagoController(config as never, sincronizacion as never);
  return { controller, sincronizar };
}

describe('WebhookMercadoPagoController', () => {
  it('rechaza un evento SIN firma, aunque diga live_mode false (antes se dejaba pasar)', async () => {
    const { controller, sincronizar } = crear();
    await expect(controller.recibirEvento(evento() as never, undefined as never, REQ_ID)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sincronizar).not.toHaveBeenCalled();
  });

  it('rechaza un evento con firma falsa', async () => {
    const { controller, sincronizar } = crear();
    await expect(controller.recibirEvento(evento() as never, firma('1792646699', 'otro-secreto'), REQ_ID)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sincronizar).not.toHaveBeenCalled();
  });

  it('con firma válida responde received y sincroniza la orden en segundo plano', async () => {
    const { controller, sincronizar } = crear();
    const r = await controller.recibirEvento(evento() as never, firma(), REQ_ID);
    expect(r).toEqual({ received: true });
    expect(sincronizar).toHaveBeenCalledWith(DATA_ID);
  });

  it('si la sincronización falla, el webhook igual responde (la conciliación la reintenta)', async () => {
    const { controller } = crear(jest.fn().mockRejectedValue(new Error('Mercado Pago no responde')));
    await expect(controller.recibirEvento(evento() as never, firma(), REQ_ID)).resolves.toEqual({ received: true });
  });

  it('con firma válida pero un evento que no interesa, lo ignora', async () => {
    const { controller, sincronizar } = crear();
    const r = await controller.recibirEvento(evento({ action: 'payment.created' }) as never, firma(), REQ_ID);
    expect(r).toEqual({ received: true });
    expect(sincronizar).not.toHaveBeenCalled();
  });

  it('con firma válida pero sin id de orden, no hace nada', async () => {
    const { controller, sincronizar } = crear();
    const sinId = evento({ data: {} });
    // sin data.id la firma no puede corresponder: se rechaza antes de llegar a sincronizar
    await expect(controller.recibirEvento(sinId as never, firma(), REQ_ID)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sincronizar).not.toHaveBeenCalled();
  });
});
