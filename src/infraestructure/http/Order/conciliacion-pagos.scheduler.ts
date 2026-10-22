import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConciliacionPagosService } from 'src/core/services/Order/conciliacion-pagos.service';

@Injectable()
export class ConciliacionPagosScheduler {
  private readonly logger = new Logger(ConciliacionPagosScheduler.name);
  private enCurso = false;

  constructor(
    private readonly conciliacion: ConciliacionPagosService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async ejecutar(): Promise<void> {
    // Se puede apagar con CONCILIACION_PAGOS_ACTIVA=false (por ejemplo en un computador de desarrollo).
    if (this.config.get<string>('CONCILIACION_PAGOS_ACTIVA', 'true') === 'false') return;
    // Si la corrida anterior sigue en marcha, no se empalma otra.
    if (this.enCurso) return;

    this.enCurso = true;
    try {
      const resumen = await this.conciliacion.conciliarPendientes();
      if (resumen.revisadas > 0) {
        this.logger.log(
          `Conciliación de pagos | revisadas=${resumen.revisadas} actualizadas=${resumen.actualizadas} errores=${resumen.errores}`,
        );
      }
    } catch (err) {
      this.logger.error('Falló la conciliación de pagos:', err);
    } finally {
      this.enCurso = false;
    }
  }
}
