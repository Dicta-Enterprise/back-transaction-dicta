// Traduce los estados de Mercado Pago a los estados internos de una orden o de un pago.
// Cubre los de la API de Orders (processed, processing, failed, canceled, expired, refunded...)
// y, por compatibilidad, los de la API antigua de pagos (approved, rejected, in_process...).

export const EstadoLocal = {
  PENDIENTE: 'PENDIENTE',
  COMPLETADO: 'COMPLETADO',
  FALLIDO: 'FALLIDO',
  CANCELADO: 'CANCELADO',
  DEVUELTO: 'DEVUELTO',
  CONTRACARGO: 'CONTRACARGO',
} as const;

export type EstadoLocalType = (typeof EstadoLocal)[keyof typeof EstadoLocal];

const MAPA: Record<string, EstadoLocalType> = {
  processed: EstadoLocal.COMPLETADO,
  approved: EstadoLocal.COMPLETADO,

  failed: EstadoLocal.FALLIDO,
  rejected: EstadoLocal.FALLIDO,

  canceled: EstadoLocal.CANCELADO,
  cancelled: EstadoLocal.CANCELADO,
  expired: EstadoLocal.CANCELADO,

  refunded: EstadoLocal.DEVUELTO,
  partially_refunded: EstadoLocal.DEVUELTO,
  charged_back: EstadoLocal.CONTRACARGO,
};

/** Cualquier estado desconocido o "en camino" (created, processing, in_process, action_required...) queda PENDIENTE. */
export function mapearEstadoMp(estadoMp: string | undefined | null): EstadoLocalType {
  if (!estadoMp) return EstadoLocal.PENDIENTE;
  return MAPA[estadoMp.toLowerCase()] ?? EstadoLocal.PENDIENTE;
}

export function esPagoAprobado(estadoMp: string | undefined | null): boolean {
  return mapearEstadoMp(estadoMp) === EstadoLocal.COMPLETADO;
}
