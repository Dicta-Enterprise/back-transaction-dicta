import { Injectable, Logger } from '@nestjs/common';
import { OrdenService } from './orden.service';
import { SincronizacionPagosService } from './sincronizacion-pagos.service';

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

// Una orden pendiente se deja un rato para que llegue el aviso normal de Mercado Pago antes de revisarla.
export const ESPERA_ANTES_DE_REVISAR_MS = 5 * MINUTO;
// No se revisan órdenes más viejas que esto: para entonces Mercado Pago ya las resolvió o vencieron.
export const ANTIGUEDAD_MAXIMA_MS = 3 * DIA;
export const MAXIMO_POR_CORRIDA = 50;
const ESPERA_ORDEN_SIN_PAGO_MS = 15 * MINUTO;

export interface ResumenConciliacion {
  revisadas: number;
  actualizadas: number;
  errores: number;
  sinPagoAsociado: number;
}

/**
 * Cubre los avisos de Mercado Pago que nunca llegaron (servidor caído, webhook rechazado...): revisa las órdenes que
 * siguen PENDIENTES y las pone al día. Las órdenes sin pago asociado (se cayó la conexión justo al cobrar) no se
 * pueden resolver solas porque no se conoce su id en Mercado Pago: solo se cuentan para avisar que hay que revisarlas.
 */
@Injectable()
export class ConciliacionPagosService {
  private readonly logger = new Logger(ConciliacionPagosService.name);

  constructor(
    private readonly ordenService: OrdenService,
    private readonly sincronizacion: SincronizacionPagosService,
  ) {}

  async conciliarPendientes(ahora: Date = new Date()): Promise<ResumenConciliacion> {
    const desde = new Date(ahora.getTime() - ANTIGUEDAD_MAXIMA_MS);
    const hasta = new Date(ahora.getTime() - ESPERA_ANTES_DE_REVISAR_MS);

    const pendientes = await this.ordenService.obtenerPendientesConPago(desde, hasta, MAXIMO_POR_CORRIDA);
    const resumen: ResumenConciliacion = { revisadas: 0, actualizadas: 0, errores: 0, sinPagoAsociado: 0 };

    for (const pendiente of pendientes) {
      resumen.revisadas++;
      try {
        const resultado = await this.sincronizacion.sincronizar(pendiente.transactionid);
        if (resultado === 'actualizada' || resultado === 'aprobada_ahora') {
          resumen.actualizadas++;
          this.logger.log(`Conciliada la orden ${pendiente.idorden}: ${resultado}`);
        }
      } catch (err) {
        // Un error en una orden no frena a las demás.
        resumen.errores++;
        this.logger.error(`No se pudo conciliar la orden ${pendiente.idorden}: ${(err as Error).message}`);
      }
    }

    resumen.sinPagoAsociado = await this.ordenService.contarPendientesSinPago(
      desde,
      new Date(ahora.getTime() - ESPERA_ORDEN_SIN_PAGO_MS),
    );
    if (resumen.sinPagoAsociado > 0) {
      this.logger.warn(
        `Hay ${resumen.sinPagoAsociado} orden(es) PENDIENTE(S) sin pago asociado: puede que Mercado Pago las haya cobrado. Revisar a mano.`,
      );
    }

    return resumen;
  }
}
