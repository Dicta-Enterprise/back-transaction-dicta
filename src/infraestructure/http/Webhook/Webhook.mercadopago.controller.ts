import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PagosService }   from 'src/core/services/Order/pagos.service';
import { OrdenService }   from 'src/core/services/Order/orden.service';
import { MercadoPagoService } from 'src/core/services/Order/mercadopago.service';
import { FacturacionService } from 'src/core/services/Facturacion/facturacion.service';
import { esPagoAprobado } from 'src/core/services/Order/estado-mp';
import { verificarFirmaMp } from 'src/core/services/Order/firma-webhook';

interface MpWebhookPayload {
  id:           string;
  type:         string;
  action:       string;
  date_created: string;
  live_mode:    boolean;
  data: {
    id: string;
  };
}

@Controller('webhooks')
export class WebhookMercadoPagoController {
  private readonly logger = new Logger(WebhookMercadoPagoController.name);
  private readonly secret: string;

  constructor(
    private readonly pagosService:       PagosService,
    private readonly ordenService:       OrdenService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly config:             ConfigService,
    private readonly facturacionService: FacturacionService,
  ) {
    this.secret = this.config.getOrThrow<string>('MP_webhook_TOKEN');
  }

  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async recibirEvento(
    @Body()                  payload:    MpWebhookPayload,
    @Headers('x-signature')  xSignature: string,
    @Headers('x-request-id') xRequestId: string,
  ): Promise<{ received: boolean }> {

    this.logger.log(
      `Webhook MP | Acción: ${payload?.action} | OrdenMP: ${payload?.data?.id} | ReqId: ${xRequestId}`,
    );

    // La firma se exige siempre (también en pruebas): Mercado Pago firma sus notificaciones con el secreto del webhook.
    const firmaValida = verificarFirmaMp({
      xSignature,
      xRequestId,
      dataId: payload?.data?.id,
      secret: this.secret,
    });

    if (!firmaValida) {
      this.logger.warn(`Webhook rechazado por firma ausente o inválida | ReqId: ${xRequestId}`);
      throw new UnauthorizedException('Firma de webhook ausente o inválida');
    }

    const acciones = ['order.updated', 'order.processed', 'order.canceled', 'order.expired'];
    if (!acciones.includes(payload?.action)) {
      this.logger.log(`Evento ignorado: ${payload?.action}`);
      return { received: true };
    }

    const ordenMpId = payload?.data?.id;
    if (!ordenMpId) {
      this.logger.warn('Webhook sin data.id');
      return { received: true };
    }

    this.sincronizarEstado(ordenMpId).catch((err) =>
      this.logger.error(`Error sincronizando orden MP ${ordenMpId}:`, err),
    );

    return { received: true };
  }


  private async sincronizarEstado(ordenMpId: string): Promise<void> {
    const ordenMp = await this.mercadoPagoService.consultarOrden(ordenMpId);

    this.logger.log(
      `Estado MP → Orden: ${ordenMpId} | Estado: ${ordenMp.status} | Detalle: ${ordenMp.status_detail}`,
    );

    const pago = await this.pagosService.obtenerPagoPorTransactionId(ordenMpId);

    if (!pago) {
      this.logger.warn(`Sin pago local para transactionid=${ordenMpId}`);
      return;
    }

    await Promise.all([
      this.pagosService.actualizarEstadoPorTransactionId(ordenMpId, ordenMp.status),
      this.ordenService.actualizarEstado(pago.idorden, ordenMp.status),
    ]);

    this.logger.log(
      `Sincronizado OK | PagoBD=${pago.id} | Orden=${pago.idorden} | Estado=${ordenMp.status}`,
    );

    if (esPagoAprobado(ordenMp.status)) {
      try {
        const resultado = await this.facturacionService.emitirSiNoExiste(pago.idorden);
        this.logger.log(`Facturación de la orden ${pago.idorden}: ${resultado}`);
      } catch (err) {
        this.logger.error(`Error emitiendo factura para Orden=${pago.idorden}:`, err);
      }
    }
  }
}
