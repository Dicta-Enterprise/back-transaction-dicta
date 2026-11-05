import { BadGatewayException, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CrearOrdenYPagarUseCase } from './create-order.usecase';
import { CrearVentaDto } from 'src/application/dto/Order/create-orden.dto';

const dtoBase = (): CrearVentaDto =>
  ({
    idusuario: 7,
    estado: 'PENDIENTE',
    aceptoTerminos: true,
    // el cliente miente a propósito con los precios y los nombres
    detalleOrden: [{ idcurso: 'c1', nombrecurso: 'Nombre falso', precio: 1 }],
    pago: {
      idorden: 99,
      fechapago: '2020-01-01T00:00:00.000Z',
      monto: 50000,
      nombrepagante: 'Ana Pérez',
      emailpagante: 'ana@correo.co',
      moneda: 'COP',
      metodopago: 'master',
      tipotarjeta: 'credit_card',
      token: 'tok_abc',
      cuotas: 1,
    },
  }) as unknown as CrearVentaDto;

const respuestaMp = (status: string, detalle = 'accredited') => ({
  id: 'ORDTST01',
  status,
  status_detail: detalle,
  total_amount: '50000',
  created_date: '2026-10-21T00:00:00Z',
  transactions: { payments: [{ id: 'PAY01', amount: '50000', status, status_detail: detalle }] },
});

function crear(opciones: { mp?: jest.Mock; curso?: jest.Mock; geo?: jest.Mock } = {}) {
  const llamadas: string[] = [];
  const registrar = (nombre: string, valor: unknown) =>
    jest.fn().mockImplementation(async (...args: unknown[]) => {
      llamadas.push(nombre);
      return typeof valor === 'function' ? (valor as (...a: unknown[]) => unknown)(...args) : valor;
    });

  const ordenService = {
    crearOrden: registrar('crearOrden', { id: 123, idusuario: 7 }),
    actualizarEstado: registrar('actualizarEstado', {}),
    guardarUbicacion: jest.fn().mockResolvedValue(undefined),
  };
  const mercadoPagoService = {
    crearOrdenPago: opciones.mp ?? registrar('crearOrdenPago', respuestaMp('processed')),
  };
  const pagosService = {
    crearPago: registrar('crearPago', { nrcompra: 55 }),
    guardarDocumentoTemporal: jest.fn(),
  };
  const postPago = { ejecutar: jest.fn().mockResolvedValue(undefined) };
  const auth = { obtenerUsuario: jest.fn().mockResolvedValue({ email: 'ana@correo.co', username: 'ana' }) };
  const facturacion = { emitirSiNoExiste: jest.fn().mockResolvedValue('emitida') };
  const geo = { ubicarIp: opciones.geo ?? jest.fn().mockResolvedValue({ pais: 'Colombia', ciudad: 'Bogotá', zonaHoraria: 'America/Bogota' }) };
  const curso = {
    obtenerCurso:
      opciones.curso ??
      jest.fn().mockImplementation(async (id: string) => {
        llamadas.push('obtenerCurso');
        return { id, nombre: 'Cyberbullying - Niños', precio: 50000 };
      }),
  };

  const useCase = new CrearOrdenYPagarUseCase(
    ordenService as never,
    mercadoPagoService as never,
    pagosService as never,
    postPago as never,
    auth as never,
    curso as never,
    facturacion as never,
    geo as never,
  );

  return { useCase, ordenService, mercadoPagoService, pagosService, postPago, auth, curso, facturacion, geo, llamadas };
}

describe('CrearOrdenYPagarUseCase', () => {
  it('cobra el precio real del catálogo y no el que dice el cliente', async () => {
    const { useCase, ordenService, mercadoPagoService, pagosService } = crear();
    await useCase.ejecutar(dtoBase());

    const ordenCreada = ordenService.crearOrden.mock.calls[0][0] as CrearVentaDto;
    expect(ordenCreada.detalleOrden).toEqual([{ idcurso: 'c1', nombrecurso: 'Cyberbullying - Niños', precio: 50000 }]);
    expect(mercadoPagoService.crearOrdenPago).toHaveBeenCalledWith(expect.objectContaining({ monto: 50000, idorden: 123 }));
    // el pago guardado lleva el monto y la fecha del servidor
    const pagoGuardado = pagosService.crearPago.mock.calls[0][1] as { monto: number; fechapago: string };
    expect(pagoGuardado.monto).toBe(50000);
    expect(pagoGuardado.fechapago).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('guarda el lugar de la compra (país, ciudad y zona horaria) a partir de la IP de la petición', async () => {
    const { useCase, ordenService, geo } = crear();
    await useCase.ejecutar(dtoBase(), '181.49.10.20');
    await new Promise((ok) => setImmediate(ok));

    expect(geo.ubicarIp).toHaveBeenCalledWith('181.49.10.20');
    expect(ordenService.guardarUbicacion).toHaveBeenCalledWith(123, { pais: 'Colombia', ciudad: 'Bogotá', zonaHoraria: 'America/Bogota' });
  });

  it('si no se puede ubicar la IP, la compra sigue y no se guarda ubicación', async () => {
    const { useCase, ordenService } = crear({ geo: jest.fn().mockResolvedValue(null) });
    await expect(useCase.ejecutar(dtoBase(), '127.0.0.1')).resolves.toMatchObject({ estadoOrden: 'processed' });
    await new Promise((ok) => setImmediate(ok));
    expect(ordenService.guardarUbicacion).not.toHaveBeenCalled();
  });

  it('un fallo al ubicar o al guardar la ubicación no tumba una compra', async () => {
    const { useCase } = crear({ geo: jest.fn().mockRejectedValue(new Error('back-auth caído')) });
    await expect(useCase.ejecutar(dtoBase(), '181.49.10.20')).resolves.toMatchObject({ estadoOrden: 'processed' });
  });

  it('guarda la orden ANTES de cobrar, para no cobrar sin dejar rastro', async () => {
    const { useCase, llamadas } = crear();
    await useCase.ejecutar(dtoBase());
    expect(llamadas.indexOf('crearOrden')).toBeGreaterThan(-1);
    expect(llamadas.indexOf('crearOrden')).toBeLessThan(llamadas.indexOf('crearOrdenPago'));
    expect(llamadas.indexOf('crearOrdenPago')).toBeLessThan(llamadas.indexOf('crearPago'));
  });

  it('rechaza un monto manipulado sin crear orden ni cobrar', async () => {
    const { useCase, ordenService, mercadoPagoService } = crear();
    const dto = dtoBase();
    dto.pago.monto = 1;
    await expect(useCase.ejecutar(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(ordenService.crearOrden).not.toHaveBeenCalled();
    expect(mercadoPagoService.crearOrdenPago).not.toHaveBeenCalled();
  });

  it('rechaza cursos repetidos, monedas distintas a COP y términos sin aceptar', async () => {
    const { useCase, mercadoPagoService } = crear();

    const repetido = dtoBase();
    repetido.detalleOrden = [repetido.detalleOrden[0], repetido.detalleOrden[0]];
    repetido.pago.monto = 100000;
    await expect(useCase.ejecutar(repetido)).rejects.toThrow('repetido');

    const usd = dtoBase();
    usd.pago.moneda = 'USD';
    await expect(useCase.ejecutar(usd)).rejects.toThrow('COP');

    const sinTerminos = dtoBase();
    sinTerminos.aceptoTerminos = false;
    await expect(useCase.ejecutar(sinTerminos)).rejects.toThrow('Términos');

    expect(mercadoPagoService.crearOrdenPago).not.toHaveBeenCalled();
  });

  it('si el catálogo no responde o el curso no existe, no se cobra', async () => {
    const caido = crear({ curso: jest.fn().mockRejectedValue(new BadRequestException('No se pudo conectar con el catálogo')) });
    await expect(caido.useCase.ejecutar(dtoBase())).rejects.toThrow('catálogo');
    expect(caido.mercadoPagoService.crearOrdenPago).not.toHaveBeenCalled();

    const inexistente = crear({ curso: jest.fn().mockRejectedValue(new NotFoundException('El curso no existe')) });
    await expect(inexistente.useCase.ejecutar(dtoBase())).rejects.toBeInstanceOf(NotFoundException);
    expect(inexistente.ordenService.crearOrden).not.toHaveBeenCalled();
  });

  it('pago aprobado: orden completada y avisos posteriores al pago (correo, lista de compradores, carrito)', async () => {
    const { useCase, ordenService, postPago } = crear();
    const r = await useCase.ejecutar(dtoBase());

    expect(r).toMatchObject({ ordenId: 123, nrcompra: 55, ordenMpId: 'ORDTST01', pagoMpId: 'PAY01', estadoOrden: 'processed', estadoDetalle: 'accredited' });
    expect(ordenService.actualizarEstado).toHaveBeenCalledWith(123, 'processed');
    expect(postPago.ejecutar).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@correo.co', cursos: ['Cyberbullying - Niños'], montoPagado: '50000', idusuario: 7, nrcompra: 55 }),
    );
  });

  it('pago aprobado: intenta facturar la orden sin esperar al webhook', async () => {
    const { useCase, facturacion } = crear();
    await useCase.ejecutar(dtoBase());
    expect(facturacion.emitirSiNoExiste).toHaveBeenCalledWith(123);
  });

  it('un fallo al facturar no tumba una compra ya cobrada', async () => {
    const { useCase, facturacion } = crear();
    facturacion.emitirSiNoExiste.mockRejectedValue(new Error('Factus caído'));
    await expect(useCase.ejecutar(dtoBase())).resolves.toMatchObject({ estadoOrden: 'processed' });
  });

  it('pago pendiente: se registra pero no se avisa ni se factura todavía', async () => {
    const { useCase, postPago, facturacion } = crear({ mp: jest.fn().mockResolvedValue(respuestaMp('processing', 'in_process')) });
    const r = await useCase.ejecutar(dtoBase());
    expect(r.estadoOrden).toBe('processing');
    expect(postPago.ejecutar).not.toHaveBeenCalled();
    expect(facturacion.emitirSiNoExiste).not.toHaveBeenCalled();
  });

  it('pago rechazado: la orden queda FALLIDA, no se registra pago y el error llega al controlador', async () => {
    const rechazo = new BadGatewayException({ mpStatus: 'failed', mpStatusDetail: 'rejected_by_issuer' });
    const { useCase, ordenService, pagosService, postPago, facturacion } = crear({ mp: jest.fn().mockRejectedValue(rechazo) });

    await expect(useCase.ejecutar(dtoBase())).rejects.toBe(rechazo);
    expect(ordenService.actualizarEstado).toHaveBeenCalledWith(123, 'failed');
    expect(pagosService.crearPago).not.toHaveBeenCalled();
    expect(postPago.ejecutar).not.toHaveBeenCalled();
    expect(facturacion.emitirSiNoExiste).not.toHaveBeenCalled();
  });

  it('si no se pudo conectar con Mercado Pago, la orden queda PENDIENTE porque no se sabe si cobró', async () => {
    const { useCase, ordenService } = crear({ mp: jest.fn().mockRejectedValue(new ServiceUnavailableException('sin conexión')) });
    await expect(useCase.ejecutar(dtoBase())).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(ordenService.actualizarEstado).not.toHaveBeenCalled();
  });
});
