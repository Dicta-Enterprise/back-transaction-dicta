import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/services/prisma/prisma.service';
import { SalesRepository } from '../../../core/repositories/sale/sales.repository';
import { SaleEntity } from '../../../core/entities/sale/sale.entity';
import type { EstadoOrdenType } from 'src/shared/enums/estado-orden.enum';



@Injectable()
export class SalesPrismaRepository implements SalesRepository {
  constructor(private readonly prisma: PrismaService) {}
  async save(venta: SaleEntity): Promise<SaleEntity> {
    const created = await this.prisma.orden.create({
      data: {
        idusuario: venta.idUsuario,
        montototal: venta.montoTotal,
        moneda: venta.moneda,
        fechacreacion: venta.fechaCreacion,
        estado: venta.estado,
        estadoorden: venta.estadoOrden as EstadoOrdenType,
        codigoqr: venta.codigoQR,
        detalleorden: {
          create: venta.detalleOrden.map((detalle) => ({
            idcurso: detalle.idCurso,
            precio: detalle.precio,
            nombrecurso: detalle.nombreCurso,
            fechacreacion: detalle.fechaCreacion,
          })),
        },
      },
      include: { detalleorden: true },
    });

      return SaleEntity.fromPrismaFull({
      orden: created,
      detalleorden: created.detalleorden,
    });
  }

  async findAll(): Promise<SaleEntity[]> {
    const rows = await this.prisma.orden.findMany({
      orderBy: { fechacreacion: 'desc' },
      include: { detalleorden: true },
    });

     return rows.map(row =>
      SaleEntity.fromPrismaFull({
        orden: row,
        detalleorden: row.detalleorden,
      }),
    );
  }
}
