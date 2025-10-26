import { Injectable } from '@nestjs/common';
import { estadoorden } from '@prisma/client';
import { PrismaService } from '../../../core/services/prisma/prisma.service';
import { SalesRepository } from '../../../core/repositories/sale/sales.repository';
import { SaleEntity } from '../../../core/entities/sale/sale.entity';


type EstadoOrdenDomain = 'PENDIENTE' | 'CANCELADO' | 'APROBADO';

@Injectable()
export class SalesPrismaRepository implements SalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(venta: SaleEntity): Promise<SaleEntity> {
    const dominio = venta.estadoOrden as EstadoOrdenDomain;
    const prismaEstado = estadoorden[dominio];

    const created = await this.prisma.orden.create({
      data: {
        idusuario: venta.idUsuario,
        montototal: venta.montoTotal,
        moneda: venta.moneda,
        fechacreacion: venta.fechaCreacion,
        estado: venta.estado,
        estadoorden: prismaEstado,
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
