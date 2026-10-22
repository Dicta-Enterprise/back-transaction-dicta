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
import { EmitirFacturaElectronicaUseCase } from 'src/application/uses-cases/Facturacion/emitir-factura-electronica.usecase';
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
    private readonly emitirFacturaUseCase: EmitirFacturaElectronicaUseCase,
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
      await this.emitirFacturaSiNoExiste(pago.idorden);
    }
  }


  private async emitirFacturaSiNoExiste(idOrden: number): Promise<void> {
    const [orden, pago] = await Promise.all([
      this.ordenService.obtenerOrdenPorId(idOrden),
      this.pagosService.obtenerPagoPorOrden(idOrden),
    ]);

    if (!orden || !pago) {
      this.logger.warn(`No se encontraron datos para facturar Orden=${idOrden}`);
      return;
    }

  

    const documentoPagante = this.pagosService.obtenerDocumentoTemporal(pago.idorden);

    try {
      const respuesta = await this.emitirFacturaUseCase.ejecutar({
        orden,
        pago,
        documento_pagante: documentoPagante,
      });

      await this.pagosService.guardarDatosFactura(pago.idorden, {
        cufe:            respuesta.data.bill.cufe,
        numero_factura:  respuesta.data.bill.number,
        factura_url:     respuesta.data.bill.public_url,
      });

      this.logger.log(
        `Factura electrónica | Orden=${idOrden} | #${respuesta.data.bill.number} | CUFE=${respuesta.data.bill.cufe}`,
      );
    } catch (err) {
      this.logger.error(`Error emitiendo factura para Orden=${idOrden}:`, err);
    }
  }
}
