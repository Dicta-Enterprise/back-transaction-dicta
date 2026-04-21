import { detalleorden as DetalleOrdenModel, orden as OrdenModel, pagos as PagosModel } from '../../../../generated/prisma';
import { DetalleOrdenEntity } from './detalle-orden.entity';
import { pagosEntity } from './pago.entity';



export class OrdenEntity {
  constructor(
    public id: number,
    public idUsuario: number,
    public fechaCreacion: Date,
    public estado: string,                    
    public detalleOrden: DetalleOrdenEntity[],
    public pago: pagosEntity,
  ) {}
  
 static fromPrismaFull(data: {
    orden: OrdenModel;
    detalleorden: DetalleOrdenModel[];
    pago: PagosModel;
  }): OrdenEntity {
    return new OrdenEntity(
      data.orden.id,
      data.orden.idusuario,
      data.orden.fechacreacion,
      data.orden.estado,
      DetalleOrdenEntity.fromPrismaList(data.detalleorden),
      pagosEntity.fromPrisma(data.pago),
    );
  }
}