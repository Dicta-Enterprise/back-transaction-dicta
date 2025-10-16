import { detalleorden as DetalleOrdenModel, orden as OrdenModel } from '@prisma/client';
import { DetailsSaleEntity } from './DetailsSale.entity';

export type EstadoOrdenEnum = 'PENDIENTE' | 'CANCELADO' | 'APROBADO';

export class SaleEntity {
  constructor(
    public id: number | null,
    public idUsuario: number,
    public montoTotal: number,
    public moneda: string,
    public fechaCreacion: Date,
    public estado: string,                   
    public estadoOrden: EstadoOrdenEnum,   
    public codigoQR: string,
    public detalleOrden: DetailsSaleEntity[],
  ) {}
  
  static fromPrismaFull(data: {
    orden: OrdenModel;
    detalleorden: DetalleOrdenModel[];
  }): SaleEntity {
    const fecha = data.orden.fechacreacion;
    return new SaleEntity(
      data.orden.id,
      data.orden.idusuario,
      Number(data.orden.montototal),
      data.orden.moneda,
      fecha,
      data.orden.estado,
      data.orden.estadoorden as EstadoOrdenEnum, 
      data.orden.codigoqr ?? '',
      DetailsSaleEntity.fromPrismaList(data.detalleorden, fecha),
    );
  }
}