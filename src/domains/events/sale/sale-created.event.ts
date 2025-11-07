import { IDomainEvent } from 'src/shared/domain/events/domain-event.interface';
import { SaleEntity } from 'src/core/entities/sale/sale.entity';

export class SaleCreatedEvent implements IDomainEvent {
  public readonly dateTimeOccurred: Date;
  public readonly sale: SaleEntity;

  constructor(sale: SaleEntity) {
    this.dateTimeOccurred = new Date();
    this.sale = sale;
  }

  public getAggregateId(): string {
    return this.sale.id != null ? String(this.sale.id) : '';
  }
}