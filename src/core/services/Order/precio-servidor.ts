// El precio de un curso lo decide el catálogo, nunca el cliente. Estas funciones son puras (sin red ni base de datos).

// El catálogo guarda los precios en pesos colombianos.
export const MONEDA_CATALOGO = 'COP';

export interface DetalleSolicitado {
  idcurso: string;
  nombrecurso: string;
  precio: number;
}

export interface CursoDelCatalogo {
  id: string;
  nombre: string;
  precio: number;
}

export interface DetalleReal {
  idcurso: string;
  nombrecurso: string;
  precio: number;
}

export class PrecioInvalidoError extends Error {}

/**
 * Construye el detalle de la orden con el nombre y el precio reales del catálogo, ignorando lo que mandó el cliente,
 * y calcula el total en pesos enteros.
 */
export function calcularDetalleReal(
  solicitado: DetalleSolicitado[],
  catalogo: Map<string, CursoDelCatalogo>,
): { detalle: DetalleReal[]; total: number } {
  const vistos = new Set<string>();
  const detalle: DetalleReal[] = [];

  for (const item of solicitado) {
    if (vistos.has(item.idcurso)) {
      throw new PrecioInvalidoError(`El curso ${item.idcurso} está repetido en la orden.`);
    }
    vistos.add(item.idcurso);

    const curso = catalogo.get(item.idcurso);
    if (!curso) {
      throw new PrecioInvalidoError(`El curso ${item.idcurso} no existe.`);
    }
    if (!Number.isFinite(curso.precio) || curso.precio <= 0) {
      throw new PrecioInvalidoError(`El curso "${curso.nombre}" no tiene un precio válido para cobrar.`);
    }

    detalle.push({ idcurso: item.idcurso, nombrecurso: curso.nombre, precio: Math.round(curso.precio) });
  }

  return { detalle, total: detalle.reduce((acc, d) => acc + d.precio, 0) };
}

/** El monto que dice el cliente debe ser exactamente el total real. */
export function validarMonto(montoCliente: number, totalReal: number): void {
  if (Math.round(Number(montoCliente)) !== totalReal) {
    throw new PrecioInvalidoError(
      `Monto inválido: se recibió ${montoCliente} pero el precio real de los cursos es ${totalReal}.`,
    );
  }
}
