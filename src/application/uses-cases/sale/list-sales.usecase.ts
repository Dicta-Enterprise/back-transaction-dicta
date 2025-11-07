import { Injectable } from '@nestjs/common';
import { SalesService } from 'src/core/services/sale/sales.service';
import { SaleEntity } from 'src/core/entities/sale/sale.entity';
import { Result } from 'src/shared/domain/result/result';

@Injectable()
export class ListSalesUseCase {
  constructor(private readonly salesService: SalesService) {}

  async execute(): Promise<Result<SaleEntity[]>> {
    try {
      const sale = await this.salesService.listar();
      return Result.ok(sale);
    } catch (error) {
      return Result.fail(error);
    }
  }
}