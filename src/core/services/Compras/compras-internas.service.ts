import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { resumirCompras, ResumenCompraUsuario } from './resumen-compras';
import { armarDetalleCompra, DetalleCompra } from './detalle-compras';

// Tope de seguridad: un usuario no debería tener tantas compras, pero la consulta no debe poder crecer sin límite.
const MAX_COMPRAS_DETALLE = 100;

// Las órdenes se marcan COMPLETADO cuando Mercado Pago confirma el pago (ver pagos.service.ts).
const ESTADO_PAGADA = 'COMPLETADO';

@Injectable()
export class ComprasInternasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Todas las compras del usuario (también las que no se pudieron cobrar), de la más reciente a la más antigua. */
  async detallePorUsuario(idusuario: number): Promise<DetalleCompra[]> {
    const ordenes = await this.prisma.orden.findMany({
      where: { idusuario },
      orderBy: { fechacreacion: 'desc' },
      take: MAX_COMPRAS_DETALLE,
      select: {
        id: true,
        fechacreacion: true,
        estado: true,
        ubicacion_pais: true,
        ubicacion_ciudad: true,
        ubicacion_zona_horaria: true,
        pagos: { select: { monto: true, moneda: true } },
        detalleorden: { select: { nombrecurso: true } },
      },
    });

    return ordenes.map(armarDetalleCompra);
  }

  async resumenPorUsuarios(ids: number[]): Promise<ResumenCompraUsuario[]> {
    if (ids.length === 0) {
      return [];
    }

    const ordenes = await this.prisma.orden.findMany({
      where: { idusuario: { in: ids }, estado: ESTADO_PAGADA },
      select: { idusuario: true, fechacreacion: true, pagos: { select: { fechapago: true } } },
    });

    return resumirCompras(
      ids,
      ordenes.map((o) => ({
        idusuario: o.idusuario,
        fechacreacion: o.fechacreacion,
        fechapago: o.pagos?.fechapago ?? null,
      })),
    );
  }
}
