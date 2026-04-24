import { detalleorden as DetalleOrdenModel } from '../../../../generated/prisma';

export class DetalleOrdenEntity {
  constructor(
    public id: number,
    public idOrden: number,
    public idCurso: string,
    public nombreCurso: string,
    public precio: number,

  ) {}

  static fromPrisma(data: DetalleOrdenModel): DetalleOrdenEntity {
    return new DetalleOrdenEntity(
      data.id,
      data.idorden,
      data.idcurso,
      data.nombrecurso,          
      Number(data.precio),
    );
  }

  static fromPrismaList(data: DetalleOrdenModel[]): DetalleOrdenEntity[] {
    return data.map((item) => DetalleOrdenEntity.fromPrisma(item));
  }
}