import { claveIdempotencia, construirPayloadOrden, formatearMonto, parsearErrorMp } from './mp-orders';
import { esPagoAprobado, mapearEstadoMp } from './estado-mp';

describe('formatearMonto', () => {
  it('COP y CLP van como entero, sin decimales', () => {
    expect(formatearMonto(10000, 'COP')).toBe('10000');
    expect(formatearMonto('10000.00', 'cop')).toBe('10000');
    expect(formatearMonto(1500.6, 'CLP')).toBe('1501');
  });

  it('otras monedas llevan dos decimales', () => {
    expect(formatearMonto(25, 'USD')).toBe('25.00');
    expect(formatearMonto('9.5', 'MXN')).toBe('9.50');
  });

  it('rechaza montos que no sean un número positivo', () => {
    expect(() => formatearMonto(0, 'COP')).toThrow();
    expect(() => formatearMonto(-5, 'COP')).toThrow();
    expect(() => formatearMonto('abc', 'COP')).toThrow();
  });
});

describe('construirPayloadOrden', () => {
  const base = {
    idorden: 42,
    monto: 10000,
    emailpagante: 'comprador@correo.co',
    metodopago: 'master',
    tipotarjeta: 'credit_card',
    token: 'tok_123',
    cuotas: 1,
    moneda: 'COP',
  };

  it('arma una orden de la API de Orders con el id real de la orden como referencia', () => {
    expect(construirPayloadOrden(base)).toEqual({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: '10000',
      external_reference: 'orden-42',
      payer: { email: 'comprador@correo.co' },
      transactions: {
        payments: [
          {
            amount: '10000',
            payment_method: { id: 'master', type: 'credit_card', token: 'tok_123', installments: 1 },
          },
        ],
      },
    });
  });

  it('respeta el modo de procesamiento si viene', () => {
    expect((construirPayloadOrden({ ...base, processing_mode: 'manual' }) as { processing_mode: string }).processing_mode).toBe('manual');
  });

  it('la clave de idempotencia es estable para la misma orden y distinta entre órdenes', () => {
    expect(claveIdempotencia(42)).toBe(claveIdempotencia(42));
    expect(claveIdempotencia(42)).not.toBe(claveIdempotencia(43));
  });
});

describe('parsearErrorMp', () => {
  it('lee un rechazo de pago (402) y saca el motivo y el id del pago', () => {
    const r = parsearErrorMp({
      errors: [{ code: 'failed', message: 'The following transactions failed', details: ['PAY01ABC: rejected_by_issuer'] }],
    });
    expect(r).toMatchObject({ mpStatus: 'failed', mpStatusDetail: 'rejected_by_issuer', mpPaymentId: 'PAY01ABC' });
  });

  it('lee fondos insuficientes', () => {
    expect(parsearErrorMp({ errors: [{ code: 'failed', details: ['PAY01XYZ: insufficient_amount'] }] }).mpStatusDetail).toBe(
      'insufficient_amount',
    );
  });

  it('un error de la petición (credenciales, datos) no se confunde con un rechazo de pago', () => {
    const r = parsearErrorMp({ errors: [{ code: 'invalid_credentials', message: 'Test credentials are not supported' }] });
    expect(r).toMatchObject({ mpStatus: 'error', mpStatusDetail: 'invalid_credentials' });
    expect(r.mpCause).toHaveLength(1);
  });

  it('lee el bloqueo del PolicyAgent (403 sin lista de errores)', () => {
    const r = parsearErrorMp({
      blocked_by: 'PolicyAgent',
      code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES',
      status: 403,
      message: 'At least one policy returned UNAUTHORIZED.',
    });
    expect(r).toMatchObject({ mpStatus: 'error', mpStatusDetail: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' });
    expect(r.mpCause).toHaveLength(1);
  });

  it('no se rompe con cuerpos vacíos o raros', () => {
    expect(parsearErrorMp(null)).toMatchObject({ mpStatus: 'error', mpStatusDetail: 'unknown_error' });
    expect(parsearErrorMp({ errors: [{ code: 'failed', details: [] }] })).toMatchObject({ mpStatus: 'failed', mpStatusDetail: 'rejected' });
  });
});

describe('mapearEstadoMp', () => {
  it('processed y approved son completados', () => {
    expect(mapearEstadoMp('processed')).toBe('COMPLETADO');
    expect(mapearEstadoMp('approved')).toBe('COMPLETADO');
    expect(esPagoAprobado('processed')).toBe(true);
  });

  it('failed, canceled, expired, refunded y charged_back', () => {
    expect(mapearEstadoMp('failed')).toBe('FALLIDO');
    expect(mapearEstadoMp('canceled')).toBe('CANCELADO');
    expect(mapearEstadoMp('cancelled')).toBe('CANCELADO');
    expect(mapearEstadoMp('expired')).toBe('CANCELADO');
    expect(mapearEstadoMp('refunded')).toBe('DEVUELTO');
    expect(mapearEstadoMp('charged_back')).toBe('CONTRACARGO');
  });

  it('los estados en camino y los desconocidos quedan pendientes', () => {
    for (const e of ['created', 'processing', 'in_process', 'action_required', 'algo_nuevo', '', undefined, null]) {
      expect(mapearEstadoMp(e as string)).toBe('PENDIENTE');
    }
    expect(esPagoAprobado('processing')).toBe(false);
  });
});
