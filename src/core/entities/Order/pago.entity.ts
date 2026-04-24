import { pagos as PagosModel } from '../../../../generated/prisma';

export class pagosEntity {
  constructor(
    public id: number,
    public idorden: number,
    public montoTotal: number,
    public fechapago: Date,
    public estado: string,                   
    public nrcompra:number,
    public nombrepagante: string,
    public emailpagante: string,
    public transactionid: string,
    public moneda: string,
  ) {}

static fromPrisma(data: PagosModel): pagosEntity {
    return new pagosEntity(
      data.id,
      data.idorden,
      Number(data.monto),
      data.fechapago,
      data.estado,
      data.nrcompra ?? null,
      data.nombrepagante ?? null,
      data.emailpagante ?? null,
      data.transactionid ?? null,
      data.moneda,
    );
  }

  static fromPrismaList(data: PagosModel[]): pagosEntity[] {
    return data.map((pago) => pagosEntity.fromPrisma(pago));
  }
}