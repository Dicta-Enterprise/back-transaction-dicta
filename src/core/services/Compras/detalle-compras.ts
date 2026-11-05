// Arma el detalle de cada compra de un usuario para el panel de administración.
// Funciones puras (sin base de datos) para poder probarlas fácil.

export type ResultadoCompra = 'EXITOSA' | 'NO_EXITOSA' | 'EN_PROCESO' | 'DEVUELTA';

export interface OrdenParaDetalle {
  id: number;
  fechacreacion: Date;
  estado: string;
  ubicacion_pais: string | null;
  ubicacion_ciudad: string | null;
  ubicacion_zona_horaria: string | null;
  pagos: { monto: { toString(): string } | number | string; moneda: string | null } | null;
  detalleorden: { nombrecurso: string }[];
}

export interface DetalleCompra {
  idorden: number;
  // Momento de la compra en UTC (ISO 8601)
  fecha: string;
  // Hora de la compra en la zona horaria del comprador ("2026-07-22 09:05"); null si no se pudo ubicar
  fechaLocal: string | null;
  zonaHoraria: string | null;
  pais: string | null;
  ciudad: string | null;
  estado: string;
  resultado: ResultadoCompra;
  monto: number | null;
  moneda: string | null;
  cursos: string[];
}

/** COMPLETADO = Mercado Pago confirmó el pago; PENDIENTE = todavía no se sabe; el resto no se cobró o se devolvió. */
export function resultadoDeEstado(estado: string): ResultadoCompra {
  switch (estado) {
    case 'COMPLETADO':
      return 'EXITOSA';
    case 'PENDIENTE':
      return 'EN_PROCESO';
    case 'DEVUELTO':
    case 'CONTRACARGO':
      return 'DEVUELTA';
    default:
      return 'NO_EXITOSA';
  }
}

/** Fecha y hora en la zona horaria dada, o null si la zona no existe. */
export function formatearHoraLocal(fecha: Date, zonaHoraria: string | null): string | null {
  if (!zonaHoraria) {
    return null;
  }

  try {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: zonaHoraria,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(fecha);

    const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
    return `${valor('year')}-${valor('month')}-${valor('day')} ${valor('hour')}:${valor('minute')}`;
  } catch {
    return null;
  }
}

export function armarDetalleCompra(orden: OrdenParaDetalle): DetalleCompra {
  const monto = orden.pagos ? Number(orden.pagos.monto.toString()) : null;

  return {
    idorden: orden.id,
    fecha: orden.fechacreacion.toISOString(),
    fechaLocal: formatearHoraLocal(orden.fechacreacion, orden.ubicacion_zona_horaria),
    zonaHoraria: orden.ubicacion_zona_horaria,
    pais: orden.ubicacion_pais,
    ciudad: orden.ubicacion_ciudad,
    estado: orden.estado,
    resultado: resultadoDeEstado(orden.estado),
    monto: monto !== null && Number.isFinite(monto) ? monto : null,
    moneda: orden.pagos?.moneda ?? null,
    cursos: orden.detalleorden.map((d) => d.nombrecurso),
  };
}
