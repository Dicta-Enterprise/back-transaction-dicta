import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrearVentaDto } from 'src/application/dto/sale/create-sale.dto';
import { SalesService } from 'src/core/services/sale/sales.service';
import { SaleCreatedEvent } from '../../../domains/events/sale/sale-created.event';
import { Result } from 'src/shared/domain/result/result';
import { SaleEntity } from 'src/core/entities/sale/sale.entity';

@Injectable()
export class CreateSaleUseCase {
  constructor(
    private readonly salesService: SalesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: CrearVentaDto): Promise<Result<SaleEntity>> {
    try {
      const sale = await this.salesService.crear(dto);
      this.eventEmitter.emit('Sale created', new SaleCreatedEvent(sale));
      return Result.ok(sale);
    } catch (error) {
      return Result.fail(error);
    }
  }
}