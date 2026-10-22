import { BadGatewayException, HttpException } from '@nestjs/common';
import { OrdersController } from './order.controller';

const resultado = (estadoOrden: string) => ({ ordenId: 1, estadoOrden, estadoDetalle: 'x' });

async function intentar(useCase: { ejecutar: jest.Mock }) {
  const controller = new OrdersController(useCase as never);
  try {
    return { respuesta: await controller.create({} as never) };
  } catch (e) {
    return { error: e as HttpException };
  }
}

describe('OrdersController', () => {
  it('pago aprobado responde 201', async () => {
    const { respuesta } = await intentar({ ejecutar: jest.fn().mockResolvedValue(resultado('processed')) });
    expect(respuesta).toMatchObject({ statusCode: 201 });
  });

  it('pago pendiente responde 202', async () => {
    const { error } = await intentar({ ejecutar: jest.fn().mockResolvedValue(resultado('processing')) });
    expect(error?.getStatus()).toBe(202);
  });

  it('un rechazo de la tarjeta responde 402 con el motivo', async () => {
    const rechazo = new BadGatewayException({ mpStatus: 'failed', mpStatusDetail: 'insufficient_amount' });
    const { error } = await intentar({ ejecutar: jest.fn().mockRejectedValue(rechazo) });
    expect(error?.getStatus()).toBe(402);
    expect(error?.getResponse()).toMatchObject({ mpStatus: 'failed', mpStatusDetail: 'insufficient_amount' });
  });

  it('un fallo de la petición a Mercado Pago (credenciales, permisos) NO se presenta como pago rechazado: responde 502', async () => {
    const fallo = new BadGatewayException({ mpStatus: 'error', mpStatusDetail: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' });
    const { error } = await intentar({ ejecutar: jest.fn().mockRejectedValue(fallo) });
    expect(error?.getStatus()).toBe(502);
    expect(error?.getResponse()).toMatchObject({ mpStatus: 'error', mpStatusDetail: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' });
  });
});
