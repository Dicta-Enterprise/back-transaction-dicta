import { FacturacionService } from './facturacion.service';

const ordenPagada = { id: 77, estado: 'COMPLETADO', detalleorden: [] };
const pagoSinFactura = { id: 5, idorden: 77, numero_factura: null, cufe: null };
const respuestaFactus = { data: { bill: { cufe: 'CUFE-123', number: 'SETP990000001', public_url: 'https://factus/f/1' } } };

function crear(opciones: { orden?: unknown; pago?: unknown; emitir?: jest.Mock } = {}) {
  const ordenService = { obtenerOrdenPorId: jest.fn().mockResolvedValue('orden' in opciones ? opciones.orden : ordenPagada) };
  const pagosService = {
    obtenerPagoPorOrden: jest.fn().mockResolvedValue('pago' in opciones ? opciones.pago : pagoSinFactura),
    obtenerDocumentoTemporal: jest.fn().mockReturnValue('1234567890'),
    guardarDatosFactura: jest.fn().mockResolvedValue({}),
  };
  const emitir = opciones.emitir ?? jest.fn().mockResolvedValue(respuestaFactus);
  const servicio = new FacturacionService(ordenService as never, pagosService as never, { ejecutar: emitir } as never);
  return { servicio, ordenService, pagosService, emitir };
}

describe('FacturacionService.emitirSiNoExiste', () => {
  it('emite la factura de una orden pagada, con el documento del comprador, y guarda sus datos', async () => {
    const { servicio, emitir, pagosService } = crear();
    await expect(servicio.emitirSiNoExiste(77)).resolves.toBe('emitida');
    expect(emitir).toHaveBeenCalledWith(expect.objectContaining({ documento_pagante: '1234567890' }));
    expect(pagosService.guardarDatosFactura).toHaveBeenCalledWith(77, {
      cufe: 'CUFE-123',
      numero_factura: 'SETP990000001',
      factura_url: 'https://factus/f/1',
    });
  });

  it('NO vuelve a emitir si el pago ya tiene factura', async () => {
    const { servicio, emitir } = crear({ pago: { ...pagoSinFactura, numero_factura: 'SETP990000001' } });
    await expect(servicio.emitirSiNoExiste(77)).resolves.toBe('ya_existia');
    expect(emitir).not.toHaveBeenCalled();

    const conCufe = crear({ pago: { ...pagoSinFactura, cufe: 'CUFE-viejo' } });
    await expect(conCufe.servicio.emitirSiNoExiste(77)).resolves.toBe('ya_existia');
    expect(conCufe.emitir).not.toHaveBeenCalled();
  });

  it('no factura órdenes que no están completadas', async () => {
    for (const estado of ['PENDIENTE', 'FALLIDO', 'CANCELADO']) {
      const { servicio, emitir } = crear({ orden: { ...ordenPagada, estado } });
      await expect(servicio.emitirSiNoExiste(77)).resolves.toBe('orden_no_pagada');
      expect(emitir).not.toHaveBeenCalled();
    }
  });

  it('si no hay orden o pago, no hace nada', async () => {
    const sinPago = crear({ pago: null });
    await expect(sinPago.servicio.emitirSiNoExiste(77)).resolves.toBe('sin_datos');
    const sinOrden = crear({ orden: null });
    await expect(sinOrden.servicio.emitirSiNoExiste(77)).resolves.toBe('sin_datos');
    expect(sinPago.emitir).not.toHaveBeenCalled();
  });

  it('dos avisos a la vez de la misma orden emiten UNA sola factura', async () => {
    let liberar: (v: unknown) => void = () => undefined;
    const emitir = jest.fn().mockImplementation(() => new Promise((ok) => (liberar = ok)));
    const { servicio } = crear({ emitir });

    const primero = servicio.emitirSiNoExiste(77);
    await new Promise((ok) => setImmediate(ok)); // deja que el primero llegue a Factus
    const segundo = await servicio.emitirSiNoExiste(77);

    expect(segundo).toBe('en_curso');
    liberar(respuestaFactus);
    await expect(primero).resolves.toBe('emitida');
    expect(emitir).toHaveBeenCalledTimes(1);
  });

  it('si Factus falla, el error sale y se puede reintentar después', async () => {
    const emitir = jest.fn().mockRejectedValueOnce(new Error('Factus caído')).mockResolvedValueOnce(respuestaFactus);
    const { servicio, pagosService } = crear({ emitir });

    await expect(servicio.emitirSiNoExiste(77)).rejects.toThrow('Factus caído');
    expect(pagosService.guardarDatosFactura).not.toHaveBeenCalled();
    await expect(servicio.emitirSiNoExiste(77)).resolves.toBe('emitida');
  });
});
