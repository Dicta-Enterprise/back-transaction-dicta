// Resume, por usuario, sus compras pagadas. Función pura (sin base de datos) para poder probarla fácil.

export interface OrdenPagada {
  idusuario: number;
  fechacreacion: Date;
  // Fecha en que se confirmó el pago, si la orden tiene un pago registrado.
  fechapago: Date | null;
}

export interface ResumenCompraUsuario {
  idusuario: number;
  compro: boolean;
  ordenesPagadas: number;
  fechaPrimeraCompra: Date | null;
}

/**
 * Devuelve una fila por cada id pedido, también para quien no ha comprado
 * (compro = false, sin fecha), para que quien consulta no tenga que deducirlo.
 */
export function resumirCompras(idsPedidos: number[], ordenesPagadas: OrdenPagada[]): ResumenCompraUsuario[] {
  const porUsuario = new Map<number, OrdenPagada[]>();
  for (const orden of ordenesPagadas) {
    const lista = porUsuario.get(orden.idusuario) ?? [];
    lista.push(orden);
    porUsuario.set(orden.idusuario, lista);
  }

  return [...new Set(idsPedidos)].map((idusuario) => {
    const ordenes = porUsuario.get(idusuario) ?? [];
    const fechas = ordenes.map((o) => (o.fechapago ?? o.fechacreacion).getTime());
    return {
      idusuario,
      compro: ordenes.length > 0,
      ordenesPagadas: ordenes.length,
      fechaPrimeraCompra: fechas.length ? new Date(Math.min(...fechas)) : null,
    };
  });
}
