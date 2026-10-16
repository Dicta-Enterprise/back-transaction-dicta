import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { resumirCompras, ResumenCompraUsuario } from './resumen-compras';

// Las órdenes se marcan COMPLETADO cuando Mercado Pago confirma el pago (ver pagos.service.ts).
const ESTADO_PAGADA = 'COMPLETADO';

@Injectable()
export class ComprasInternasService {
  constructor(private readonly prisma: PrismaService) {}

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
