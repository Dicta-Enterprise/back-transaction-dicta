import { armarDetalleCompra, formatearHoraLocal, OrdenParaDetalle, resultadoDeEstado } from './detalle-compras';

const orden = (cambios: Partial<OrdenParaDetalle> = {}): OrdenParaDetalle => ({
  id: 41,
  fechacreacion: new Date('2026-07-22T19:05:00.000Z'),
  estado: 'COMPLETADO',
  ubicacion_pais: 'Colombia',
  ubicacion_ciudad: 'Bogotá',
  ubicacion_zona_horaria: 'America/Bogota',
  pagos: { monto: '50000.00', moneda: 'COP' },
  detalleorden: [{ nombrecurso: 'Cyberbullying - Niños' }],
  ...cambios,
});

describe('resultadoDeEstado', () => {
  it('traduce el estado de la orden a lo que ve el administrador', () => {
    expect(resultadoDeEstado('COMPLETADO')).toBe('EXITOSA');
    expect(resultadoDeEstado('PENDIENTE')).toBe('EN_PROCESO');
    expect(resultadoDeEstado('FALLIDO')).toBe('NO_EXITOSA');
    expect(resultadoDeEstado('CANCELADO')).toBe('NO_EXITOSA');
    expect(resultadoDeEstado('DEVUELTO')).toBe('DEVUELTA');
    expect(resultadoDeEstado('CONTRACARGO')).toBe('DEVUELTA');
    expect(resultadoDeEstado('ALGO_RARO')).toBe('NO_EXITOSA');
  });
});

describe('formatearHoraLocal', () => {
  it('muestra la hora de la zona del comprador, no la del servidor', () => {
    const fecha = new Date('2026-07-22T19:05:00.000Z');
    expect(formatearHoraLocal(fecha, 'America/Bogota')).toBe('2026-07-22 14:05');
    expect(formatearHoraLocal(fecha, 'Europe/Madrid')).toBe('2026-07-22 21:05');
  });

  it('devuelve null si no hay zona o la zona no existe', () => {
    const fecha = new Date('2026-07-22T19:05:00.000Z');
    expect(formatearHoraLocal(fecha, null)).toBeNull();
    expect(formatearHoraLocal(fecha, 'Marte/Olympus')).toBeNull();
  });

  it('a medianoche escribe 00 y no 24', () => {
    expect(formatearHoraLocal(new Date('2026-07-22T05:00:00.000Z'), 'America/Bogota')).toBe('2026-07-22 00:00');
  });
});

describe('armarDetalleCompra', () => {
  it('arma país, ciudad, fecha, hora local y resultado de una compra exitosa', () => {
    expect(armarDetalleCompra(orden())).toEqual({
      idorden: 41,
      fecha: '2026-07-22T19:05:00.000Z',
      fechaLocal: '2026-07-22 14:05',
      zonaHoraria: 'America/Bogota',
      pais: 'Colombia',
      ciudad: 'Bogotá',
      estado: 'COMPLETADO',
      resultado: 'EXITOSA',
      monto: 50000,
      moneda: 'COP',
      cursos: ['Cyberbullying - Niños'],
    });
  });

  it('una compra fallida sin pago ni ubicación igual se puede mostrar', () => {
    const detalle = armarDetalleCompra(
      orden({ estado: 'FALLIDO', pagos: null, ubicacion_pais: null, ubicacion_ciudad: null, ubicacion_zona_horaria: null }),
    );
    expect(detalle).toMatchObject({
      resultado: 'NO_EXITOSA',
      pais: null,
      ciudad: null,
      fechaLocal: null,
      monto: null,
      moneda: null,
    });
  });

  it('acepta el monto como número o como Decimal de Prisma', () => {
    expect(armarDetalleCompra(orden({ pagos: { monto: 12500, moneda: 'COP' } })).monto).toBe(12500);
    expect(armarDetalleCompra(orden({ pagos: { monto: { toString: () => '9900.50' }, moneda: 'COP' } })).monto).toBe(9900.5);
  });
});
