import { SincronizacionPagosService } from './sincronizacion-pagos.service';

const ordenLocal = (estado: string) => ({
  id: 77,
  idusuario: 7,
  estado,
  detalleorden: [{ nombrecurso: 'Cyberbullying - Niños' }, { nombrecurso: null }],
});
const pagoLocal = { id: 5, idorden: 77, nrcompra: 55, nombrepagante: 'Ana Pérez' };
const ordenMp = (status: string, detalle = 'accredited') => ({
  id: 'ORDTST01',
  status,
  status_detail: detalle,
  total_amount: '50000',
  transactions: { payments: [{ id: 'PAY01', amount: '50000', status, status_detail: detalle }] },
});

function crear(opciones: { pago?: unknown; estadoLocal?: string; mp?: jest.Mock } = {}) {
  const pagosService = {
    obtenerPagoPorTransactionId: jest.fn().mockResolvedValue('pago' in opciones ? opciones.pago : pagoLocal),
    actualizarEstadoPorTransactionId: jest.fn().mockResolvedValue({}),
  };
  const ordenService = {
    obtenerOrdenPorId: jest.fn().mockResolvedValue(ordenLocal(opciones.estadoLocal ?? 'PENDIENTE')),
    actualizarEstado: jest.fn().mockResolvedValue({}),
  };
  const mercadoPago = { consultarOrden: opciones.mp ?? jest.fn().mockResolvedValue(ordenMp('processed')) };
  const facturacion = { emitirSiNoExiste: jest.fn().mockResolvedValue('emitida') };
  const postPago = { ejecutar: jest.fn().mockResolvedValue(undefined) };
  const auth = { obtenerUsuario: jest.fn().mockResolvedValue({ email: 'ana@correo.co', username: 'ana' }) };

  const servicio = new SincronizacionPagosService(
    pagosService as never,
    ordenService as never,
    mercadoPago as never,
    facturacion as never,
    postPago as never,
    auth as never,
  );
  return { servicio, pagosService, ordenService, mercadoPago, facturacion, postPago, auth };
}

describe('SincronizacionPagosService', () => {
  it('sin pago local no consulta a Mercado Pago ni cambia nada', async () => {
    const { servicio, mercadoPago, ordenService } = crear({ pago: null });
    await expect(servicio.sincronizar('ORDTST01')).resolves.toBe('sin_pago_local');
    expect(mercadoPago.consultarOrden).not.toHaveBeenCalled();
    expect(ordenService.actualizarEstado).not.toHaveBeenCalled();
  });

  it('una orden pendiente que Mercado Pago ya aprobó: actualiza, avisa al comprador y factura', async () => {
    const { servicio, pagosService, ordenService, postPago, facturacion } = crear();
    await expect(servicio.sincronizar('ORDTST01')).resolves.toBe('aprobada_ahora');

    expect(pagosService.actualizarEstadoPorTransactionId).toHaveBeenCalledWith('ORDTST01', 'processed');
    expect(ordenService.actualizarEstado).toHaveBeenCalledWith(77, 'processed');
    expect(postPago.ejecutar).toHaveBeenCalledWith({
      email: 'ana@correo.co',
      nombreUsuario: 'ana',
      nrcompra: 55,
      cursos: ['Cyberbullying - Niños'],
      montoPagado: '50000',
      idusuario: 7,
    });
    expect(facturacion.emitirSiNoExiste).toHaveBeenCalledWith(77);
  });

  it('repetir la sincronización de una orden ya completada NO vuelve a avisar al comprador (sí revisa la factura)', async () => {
    const { servicio, postPago, facturacion } = crear({ estadoLocal: 'COMPLETADO' });
    await expect(servicio.sincronizar('ORDTST01')).resolves.toBe('sin_cambios');
    expect(postPago.ejecutar).not.toHaveBeenCalled();
    expect(facturacion.emitirSiNoExiste).toHaveBeenCalledWith(77);
  });

  it('una orden que Mercado Pago marcó como fallida se actualiza sin avisos ni factura', async () => {
    const { servicio, postPago, facturacion, ordenService } = crear({ mp: jest.fn().mockResolvedValue(ordenMp('failed', 'rejected_by_issuer')) });
    await expect(servicio.sincronizar('ORDTST01')).resolves.toBe('actualizada');
    expect(ordenService.actualizarEstado).toHaveBeenCalledWith(77, 'failed');
    expect(postPago.ejecutar).not.toHaveBeenCalled();
    expect(facturacion.emitirSiNoExiste).not.toHaveBeenCalled();
  });

  it('si sigue en proceso queda sin cambios', async () => {
    const { servicio, postPago } = crear({ mp: jest.fn().mockResolvedValue(ordenMp('processing', 'in_process')) });
    await expect(servicio.sincronizar('ORDTST01')).resolves.toBe('sin_cambios');
    expect(postPago.ejecutar).not.toHaveBeenCalled();
  });

  it('si no se puede avisar al comprador, no falla y la factura se intenta igual', async () => {
    const { servicio, auth, facturacion } = crear();
    auth.obtenerUsuario.mockRejectedValue(new Error('back-auth caído'));
    await expect(servicio.sincronizar('ORDTST01')).resolves.toBe('aprobada_ahora');
    expect(facturacion.emitirSiNoExiste).toHaveBeenCalled();
  });

  it('si la factura falla, la sincronización no falla', async () => {
    const { servicio, facturacion } = crear();
    facturacion.emitirSiNoExiste.mockRejectedValue(new Error('Factus caído'));
    await expect(servicio.sincronizar('ORDTST01')).resolves.toBe('aprobada_ahora');
  });

  it('si Mercado Pago no responde, el error sale para que quien llama (webhook o conciliación) lo maneje', async () => {
    const { servicio, ordenService } = crear({ mp: jest.fn().mockRejectedValue(new Error('sin conexión')) });
    await expect(servicio.sincronizar('ORDTST01')).rejects.toThrow('sin conexión');
    expect(ordenService.actualizarEstado).not.toHaveBeenCalled();
  });
});
