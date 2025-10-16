import { SaleEntity } from '../../entities/sale/sale.entity';

export interface SalesRepository {
  findAll(): Promise<SaleEntity[]>;
  save(venta: SaleEntity): Promise<SaleEntity>;
}