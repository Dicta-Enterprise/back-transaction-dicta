import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CarritoAbandonadoUseCase } from 'src/application/uses-cases/Carrito-recovery/carrito-abandonado.usecase';

@Injectable()
export class CarritoAbandonadoScheduler {
  private readonly logger = new Logger(CarritoAbandonadoScheduler.name);

  constructor(private readonly carritoAbandonadoUseCase: CarritoAbandonadoUseCase) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async ejecutar(): Promise<void> {
    this.logger.log('[Cron] Iniciando revisión de carritos abandonados...');
    await this.carritoAbandonadoUseCase.ejecutar();
    this.logger.log('[Cron] Revisión completada.');
  }
}