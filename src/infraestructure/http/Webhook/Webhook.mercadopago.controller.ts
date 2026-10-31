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
import { verificarFirmaMp } from 'src/core/services/Order/firma-webhook';
import { SincronizacionPagosService } from 'src/core/services/Order/sincronizacion-pagos.service';

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

const ACCIONES_QUE_INTERESAN = ['order.updated', 'order.processed', 'order.canceled', 'order.expired'];

@Controller('webhooks')
export class WebhookMercadoPagoController {
  private readonly logger = new Logger(WebhookMercadoPagoController.name);
  private readonly secret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly sincronizacion: SincronizacionPagosService,
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

    if (!ACCIONES_QUE_INTERESAN.includes(payload?.action)) {
      this.logger.log(`Evento ignorado: ${payload?.action}`);
      return { received: true };
    }

    const ordenMpId = payload?.data?.id;
    if (!ordenMpId) {
      this.logger.warn('Webhook sin data.id');
      return { received: true };
    }

    // Se responde enseguida (Mercado Pago espera una respuesta rápida) y la sincronización sigue en segundo plano.
    // Si algo falla, el proceso de conciliación la reintenta más tarde.
    this.sincronizacion.sincronizar(ordenMpId).catch((err) =>
      this.logger.error(`Error sincronizando orden MP ${ordenMpId}:`, err),
    );

    return { received: true };
  }
}
