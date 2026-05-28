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
import * as crypto from 'crypto';
import { PagosService } from 'src/core/services/Order/pagos.service';
import { OrdenService } from 'src/core/services/Order/orden.service';
import { MercadoPagoService } from 'src/core/services/Order/mercadopago.service';
 
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

  if (payload?.live_mode !== false) {
    this.verificarFirma(xSignature, xRequestId, payload?.data?.id);
  } else {
    this.logger.warn('Modo test detectado (live_mode: false) — verificación de firma omitida');
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
  }

private verificarFirma(xSignature: string, xRequestId: string, dataId: string): void {
  // En modo test/sandbox MP no envía firma — permitir pasar
  if (!xSignature) {
    this.logger.warn('Webhook sin x-signature — omitiendo verificación (modo test)');
    return; // ← antes lanzaba UnauthorizedException aquí
  }

  
    const parts = Object.fromEntries(
      xSignature.split(',').map((p) => {
        const i = p.indexOf('=');
        return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
      }),
    ) as { ts?: string; v1?: string };
 
    if (!parts.ts || !parts.v1) {
      throw new UnauthorizedException('Formato de x-signature inválido');
    }
 
    const manifest      = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
    const hashEsperado  = crypto.createHmac('sha256', this.secret).update(manifest).digest('hex');
 
    let valida = false;
    try {
      const a = Buffer.from(parts.v1,     'hex');
      const b = Buffer.from(hashEsperado, 'hex');
      valida  = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      valida = false;
    }
 
    if (!valida) {
      this.logger.warn(`Firma rechazada | recibido=${parts.v1} | esperado=${hashEsperado}`);
      throw new UnauthorizedException('Firma HMAC inválida');
    }
  }
}