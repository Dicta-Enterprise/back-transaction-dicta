import { Injectable, Logger } from '@nestjs/common';
import { AuthApiService } from 'src/core/services/auth/auth-api.service';
import { FacturacionService } from 'src/core/services/Facturacion/facturacion.service';
import { EstadoLocal, esPagoAprobado, mapearEstadoMp } from './estado-mp';
import { MercadoPagoService, MpOrderResponse } from './mercadopago.service';
import { OrdenConDetalle, OrdenService } from './orden.service';
import { PagosService } from './pagos.service';
import { PostPagoService } from './post-pago.service';
import { pagos } from 'generated/prisma';

export type ResultadoSincronizacion = 'sin_pago_local' | 'sin_cambios' | 'actualizada' | 'aprobada_ahora';

/**
 * Pone al día el estado local de un pago con lo que dice Mercado Pago. Lo usan el webhook (cuando MP avisa) y el
 * proceso de conciliación (cuando el aviso nunca llegó). Si la orden pasa a aprobada por primera vez avisa al
 * comprador; después de eso, repetir la sincronización no vuelve a enviar nada. La factura se emite sin duplicar.
 */
@Injectable()
export class SincronizacionPagosService {
  private readonly logger = new Logger(SincronizacionPagosService.name);

  constructor(
    private readonly pagosService: PagosService,
    private readonly ordenService: OrdenService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly facturacionService: FacturacionService,
    private readonly postPagoService: PostPagoService,
    private readonly authApiService: AuthApiService,
  ) {}

  async sincronizar(ordenMpId: string): Promise<ResultadoSincronizacion> {
    const pago = await this.pagosService.obtenerPagoPorTransactionId(ordenMpId);
    if (!pago) {
      this.logger.warn(`Sin pago local para transactionid=${ordenMpId}`);
      return 'sin_pago_local';
    }

    const ordenMp = await this.mercadoPagoService.consultarOrden(ordenMpId);
    const ordenLocal = await this.ordenService.obtenerOrdenPorId(pago.idorden);
    const estadoAnterior = ordenLocal.estado;

    this.logger.log(
      `Estado MP → Orden: ${ordenMpId} | Estado: ${ordenMp.status} | Detalle: ${ordenMp.status_detail} | Antes: ${estadoAnterior}`,
    );

    await Promise.all([
      this.pagosService.actualizarEstadoPorTransactionId(ordenMpId, ordenMp.status),
      this.ordenService.actualizarEstado(pago.idorden, ordenMp.status),
    ]);

    if (!esPagoAprobado(ordenMp.status)) {
      return mapearEstadoMp(ordenMp.status) === estadoAnterior ? 'sin_cambios' : 'actualizada';
    }

    const esPrimeraAprobacion = estadoAnterior !== EstadoLocal.COMPLETADO;
    if (esPrimeraAprobacion) {
      await this.avisarAlComprador(ordenLocal, pago, ordenMp);
    }

    try {
      const resultado = await this.facturacionService.emitirSiNoExiste(pago.idorden);
      this.logger.log(`Facturación de la orden ${pago.idorden}: ${resultado}`);
    } catch (err) {
      this.logger.error(`Error emitiendo factura para Orden=${pago.idorden}:`, err);
    }

    return esPrimeraAprobacion ? 'aprobada_ahora' : 'sin_cambios';
  }

  private async avisarAlComprador(orden: OrdenConDetalle, pago: pagos, ordenMp: MpOrderResponse): Promise<void> {
    try {
      const usuario = await this.authApiService.obtenerUsuario(orden.idusuario);
      if (!usuario?.email) return;

      const primerPago = ordenMp.transactions?.payments?.[0];
      await this.postPagoService.ejecutar({
        email: usuario.email,
        nombreUsuario: usuario.username ?? pago.nombrepagante ?? '',
        nrcompra: pago.nrcompra ?? orden.id,
        cursos: orden.detalleorden.map((d) => d.nombrecurso ?? '').filter(Boolean),
        montoPagado: primerPago?.paid_amount ?? primerPago?.amount ?? ordenMp.total_amount,
        idusuario: orden.idusuario,
      });
    } catch (err) {
      this.logger.error(`No se pudo avisar al comprador de la orden ${orden.id}:`, err);
    }
  }
}
