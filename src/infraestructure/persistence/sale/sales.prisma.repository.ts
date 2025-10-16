import { Injectable } from '@nestjs/common';
import { estadoorden } from '@prisma/client';
import { PrismaService } from '../../../core/services/prisma/prisma.service';
import { SalesRepository } from '../../../core/repositories/sale/sales.repository';
import { SaleEntity } from '../../../core/entities/sale/sale.entity';
import { DetailsSaleEntity } from '../../../core/entities/sale/DetailsSale.entity';

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
          create: venta.detalleOrden.map((d) => ({
            idcurso: d.idCurso,
            precio: d.precio,
            nombrecurso: d.nombreCurso,
            fechacreacion: d.fechaCreacion,
          })),
        },
      },
      include: { detalleorden: true },
    });

    return new SaleEntity(
      created.id,
      created.idusuario,
      Number(created.montototal),
      created.moneda,
      created.fechacreacion,
      created.estado,
      created.estadoorden as EstadoOrdenDomain | null,
      created.codigoqr,
      DetailsSaleEntity.fromPrismaList(created.detalleorden, created.fechacreacion),
    );
  }

  async findAll(): Promise<SaleEntity[]> {
    const rows = await this.prisma.orden.findMany({
      orderBy: { fechacreacion: 'desc' },
      include: { detalleorden: true },
    });

    return rows.map((o) =>
      new SaleEntity(
        o.id,
        o.idusuario,
        Number(o.montototal),
        o.moneda,
        o.fechacreacion,
        o.estado,
        o.estadoorden as EstadoOrdenDomain | null,
        o.codigoqr,
        DetailsSaleEntity.fromPrismaList(o.detalleorden, o.fechacreacion),
      ),
    );
  }
}
