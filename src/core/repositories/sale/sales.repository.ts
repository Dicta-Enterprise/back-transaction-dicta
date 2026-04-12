import { SaleEntity } from '../../entities/sale/sale.entity';

export interface SalesRepository {
  save(venta: SaleEntity): Promise<SaleEntity>;
  findAll(): Promise<SaleEntity[]>;
  updateMpid(ordenId: number, mpid: string): Promise<void>;
}