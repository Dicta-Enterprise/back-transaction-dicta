import { detalleorden as DetalleOrdenModel } from '../../../../generated/prisma';

export class DetailsSaleEntity {
  constructor(
    public id: number,
    public idCurso: string,
    public nombreCurso: string,
    public precio: number,
    public fechaCreacion: Date,
  ) {}

  static fromPrisma(data: DetalleOrdenModel): DetailsSaleEntity {
    return new DetailsSaleEntity(
      data.id,
      data.idcurso,
      data.nombrecurso,          
      Number(data.precio),
      data.fechacreacion,
    );
  }

  static fromPrismaList(data: DetalleOrdenModel[]): DetailsSaleEntity[] {
    return data.map((item) => DetailsSaleEntity.fromPrisma(item));
  }
}