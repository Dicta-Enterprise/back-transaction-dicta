import { detalleorden as DetalleOrdenModel } from '@prisma/client';

export class DetailsSaleEntity {
  constructor(
    public id: number,
    public idCurso: string,
    public nombreCurso: string,
    public precio: number,
    public fechaCreacion: Date,
  ) {}

  static fromPrisma(data: DetalleOrdenModel, fallbackFecha: Date): DetailsSaleEntity {
    return new DetailsSaleEntity(
      data.id,
      data.idcurso,
      data.nombrecurso ?? '',          
      Number(data.precio),
      data.fechacreacion ?? fallbackFecha,
    );
  }

  static fromPrismaList(data: DetalleOrdenModel[], fallbackFecha: Date): DetailsSaleEntity[] {
    return data.map((r) => DetailsSaleEntity.fromPrisma(r, fallbackFecha));
  }
}