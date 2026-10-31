// Armado y lectura de mensajes de la API de Orders de Mercado Pago (https://api.mercadopago.com/v1/orders).
// Son funciones puras, sin red ni base de datos, para poder probarlas fácil.

export interface CrearOrdenMpPayload {
  idorden: number;
  monto: number | string;
  emailpagante: string;
  metodopago: string;
  tipotarjeta: string;
  token: string;
  cuotas: number;
  moneda: string;
  processing_mode?: string;
}

// Monedas que Mercado Pago maneja sin centavos: el monto va como entero ("10000", no "10000.00").
const MONEDAS_SIN_DECIMALES = new Set(['COP', 'CLP']);

export function formatearMonto(monto: number | string, moneda: string): string {
  const valor = Number(monto);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error(`Monto inválido para Mercado Pago: ${monto}`);
  }
  return MONEDAS_SIN_DECIMALES.has(moneda.toUpperCase()) ? String(Math.round(valor)) : valor.toFixed(2);
}

/** Cuerpo de POST /v1/orders para cobrar con una tarjeta tokenizada. */
export function construirPayloadOrden(p: CrearOrdenMpPayload): object {
  const monto = formatearMonto(p.monto, p.moneda);

  return {
    type: 'online',
    processing_mode: p.processing_mode ?? 'automatic',
    total_amount: monto,
    external_reference: `orden-${p.idorden}`,
    payer: { email: p.emailpagante },
    transactions: {
      payments: [
        {
          amount: monto,
          payment_method: {
            id: p.metodopago,
            type: p.tipotarjeta,
            token: p.token,
            installments: Number(p.cuotas),
          },
        },
      ],
    },
  };
}

/**
 * Una misma orden no se cobra dos veces aunque la petición se repita: Mercado Pago devuelve el mismo
 * resultado para la misma clave. Como la orden local se crea antes de cobrar, su id identifica el intento.
 */
export function claveIdempotencia(idorden: number): string {
  return `orden-${idorden}`;
}

export interface ErrorMp {
  // 'failed' = el pago fue rechazado; 'error' = la petición misma estaba mal o no tenía permiso.
  mpStatus: 'failed' | 'error';
  mpStatusDetail: string;
  mpPaymentId?: string;
  mpCause: unknown[];
}

interface ErrorItemMp {
  code?: string;
  message?: string;
  details?: unknown[];
}

/**
 * Mercado Pago responde 402 con {"errors":[{"code":"failed","details":["PAY01...: rejected_by_issuer"]}]}
 * cuando rechaza un pago, y otros códigos (invalid_credentials, property_value, ...) cuando la petición falla.
 */
export function parsearErrorMp(body: unknown): ErrorMp {
  const errores = ((body as { errors?: ErrorItemMp[] } | null | undefined)?.errors ?? []) as ErrorItemMp[];
  const primero = errores[0];

  if (primero?.code === 'failed') {
    const detalle = String(primero.details?.[0] ?? '');
    const coincide = /^(\S+):\s*(\S+)$/.exec(detalle);
    return {
      mpStatus: 'failed',
      mpStatusDetail: coincide ? coincide[2] : 'rejected',
      mpPaymentId: coincide ? coincide[1] : undefined,
      mpCause: errores,
    };
  }

  // Respuestas sin "errors", por ejemplo el bloqueo del PolicyAgent (403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES), que
  // Mercado Pago devuelve tanto con una credencial inválida como cuando la aplicación no tiene habilitada la API.
  const plano = (body ?? {}) as { code?: string; error?: string; message?: string };
  if (!primero && (plano.code || plano.error || plano.message)) {
    return {
      mpStatus: 'error',
      mpStatusDetail: plano.code ?? plano.error ?? 'unknown_error',
      mpCause: [body],
    };
  }

  return {
    mpStatus: 'error',
    mpStatusDetail: primero?.code ?? 'unknown_error',
    mpCause: errores,
  };
}
