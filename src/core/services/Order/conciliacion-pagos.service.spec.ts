import {
  ANTIGUEDAD_MAXIMA_MS,
  ConciliacionPagosService,
  ESPERA_ANTES_DE_REVISAR_MS,
  MAXIMO_POR_CORRIDA,
} from './conciliacion-pagos.service';

const ahora = new Date('2026-10-22T12:00:00.000Z');

function crear(opciones: { pendientes?: { idorden: number; transactionid: string }[]; sinPago?: number; sincronizar?: jest.Mock } = {}) {
  const ordenService = {
    obtenerPendientesConPago: jest.fn().mockResolvedValue(opciones.pendientes ?? []),
    contarPendientesSinPago: jest.fn().mockResolvedValue(opciones.sinPago ?? 0),
  };
  const sincronizar = opciones.sincronizar ?? jest.fn().mockResolvedValue('sin_cambios');
  const servicio = new ConciliacionPagosService(ordenService as never, { sincronizar } as never);
  return { servicio, ordenService, sincronizar };
}

describe('ConciliacionPagosService', () => {
  it('revisa solo las órdenes pendientes que ya llevan un rato y no son demasiado viejas', async () => {
    const { servicio, ordenService } = crear();
    await servicio.conciliarPendientes(ahora);

    const [desde, hasta, limite] = ordenService.obtenerPendientesConPago.mock.calls[0] as [Date, Date, number];
    expect(hasta.getTime()).toBe(ahora.getTime() - ESPERA_ANTES_DE_REVISAR_MS);
    expect(desde.getTime()).toBe(ahora.getTime() - ANTIGUEDAD_MAXIMA_MS);
    expect(limite).toBe(MAXIMO_POR_CORRIDA);
  });

  it('sincroniza cada orden con su id de Mercado Pago y cuenta las que cambiaron', async () => {
    const sincronizar = jest
      .fn()
      .mockResolvedValueOnce('aprobada_ahora')
      .mockResolvedValueOnce('sin_cambios')
      .mockResolvedValueOnce('actualizada');
    const { servicio } = crear({
      sincronizar,
      pendientes: [
        { idorden: 1, transactionid: 'ORD-A' },
        { idorden: 2, transactionid: 'ORD-B' },
        { idorden: 3, transactionid: 'ORD-C' },
      ],
    });

    const r = await servicio.conciliarPendientes(ahora);
    expect(sincronizar.mock.calls.map((c) => c[0])).toEqual(['ORD-A', 'ORD-B', 'ORD-C']);
    expect(r).toMatchObject({ revisadas: 3, actualizadas: 2, errores: 0 });
  });

  it('un error en una orden no frena a las demás', async () => {
    const sincronizar = jest.fn().mockRejectedValueOnce(new Error('MP no responde')).mockResolvedValueOnce('aprobada_ahora');
    const { servicio } = crear({
      sincronizar,
      pendientes: [
        { idorden: 1, transactionid: 'ORD-A' },
        { idorden: 2, transactionid: 'ORD-B' },
      ],
    });

    const r = await servicio.conciliarPendientes(ahora);
    expect(sincronizar).toHaveBeenCalledTimes(2);
    expect(r).toMatchObject({ revisadas: 2, actualizadas: 1, errores: 1 });
  });

  it('cuenta las órdenes pendientes sin pago asociado, que no se pueden resolver solas', async () => {
    const { servicio, ordenService } = crear({ sinPago: 3 });
    const r = await servicio.conciliarPendientes(ahora);
    expect(r.sinPagoAsociado).toBe(3);
    // solo cuenta las que ya llevan 15 minutos: antes puede que el cobro siga en curso
    const [, hasta] = ordenService.contarPendientesSinPago.mock.calls[0] as [Date, Date];
    expect(hasta.getTime()).toBe(ahora.getTime() - 15 * 60_000);
  });

  it('sin pendientes no hace nada', async () => {
    const { servicio, sincronizar } = crear();
    await expect(servicio.conciliarPendientes(ahora)).resolves.toEqual({ revisadas: 0, actualizadas: 0, errores: 0, sinPagoAsociado: 0 });
    expect(sincronizar).not.toHaveBeenCalled();
  });
});
