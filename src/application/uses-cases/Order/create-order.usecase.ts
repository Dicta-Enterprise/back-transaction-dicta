import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';

import { CrearVentaDto } from 'src/application/dto/Order/create-orden.dto';
import { OrdenService } from 'src/core/services/Order/orden.service';
import {
  MercadoPagoService,
  MpOrderResponse,
} from 'src/core/services/Order/mercadopago.service';
import { PagosService } from 'src/core/services/Order/pagos.service';
import { PostPagoService } from 'src/core/services/Order/post-pago.service';
import { AuthApiService } from 'src/core/services/auth/auth-api.service';
import { CursoApiService } from 'src/core/services/curso/curso-api.service';
import { FacturacionService } from 'src/core/services/Facturacion/facturacion.service';
import { esPagoAprobado } from 'src/core/services/Order/estado-mp';
import {
  calcularDetalleReal,
  CursoDelCatalogo,
  DetalleReal,
  MONEDA_CATALOGO,
  PrecioInvalidoError,
  validarMonto,
} from 'src/core/services/Order/precio-servidor';

export interface PagoResultado {
  ordenId: number;
  nrcompra: number | null;
  ordenMpId: string;
  pagoMpId: string;
  estadoOrden: string;
  estadoDetalle: string;
  montoPagado: string;
  fechaCreacion: string;
}

@Injectable()
export class CrearOrdenYPagarUseCase {
  private readonly logger = new Logger(CrearOrdenYPagarUseCase.name);

  constructor(
    private readonly ordenService: OrdenService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly pagosService: PagosService,
    private readonly postPagoService: PostPagoService,
    private readonly authApiService: AuthApiService,
    private readonly cursoApiService: CursoApiService,
    private readonly facturacionService: FacturacionService,
  ) {}

  /**
   * Orden de las operaciones (importa para no cobrar sin dejar rastro):
   *  1. Se valida el precio real contra el catálogo (lo que mande el cliente no cuenta).
   *  2. Se guarda la orden local como PENDIENTE: su id identifica el intento de cobro.
   *  3. Se cobra en Mercado Pago (API de Orders) con una clave de idempotencia basada en esa orden.
   *  4. Se registra el pago y se actualiza el estado.
   */
  async ejecutar(dto: CrearVentaDto): Promise<PagoResultado> {
    if (!dto.aceptoTerminos) {
      throw new BadRequestException(
        'Debes aceptar los Términos y Condiciones para realizar la compra.',
      );
    }

    if (dto.pago.moneda.toUpperCase() !== MONEDA_CATALOGO) {
      throw new BadRequestException(
        `Por ahora solo se puede pagar en ${MONEDA_CATALOGO}.`,
      );
    }

    const { detalle, total } = await this.resolverPrecioReal(dto);

    const orden = await this.ordenService.crearOrden({
      ...dto,
      detalleOrden: detalle,
    });

    let respuestaMp: MpOrderResponse;
    try {
      respuestaMp = await this.mercadoPagoService.crearOrdenPago({
        idorden: orden.id,
        monto: total,
        emailpagante: dto.pago.emailpagante,
        metodopago: dto.pago.metodopago,
        tipotarjeta: dto.pago.tipotarjeta,
        token: dto.pago.token,
        cuotas: dto.pago.cuotas,
        moneda: dto.pago.moneda,
        processing_mode: dto.pago.processing_mode ?? 'automatic',
      });
    } catch (error) {
      await this.marcarOrdenSinCobro(orden.id, error);
      throw error;
    }

    // El monto y la fecha que se guardan son los del servidor, no los que mandó el cliente.
    const pagoReal = {
      ...dto.pago,
      monto: total,
      fechapago: new Date().toISOString(),
    };

    const pagoRegistrado = await this.pagosService.crearPago(
      orden.id,
      pagoReal,
      respuestaMp,
    );

    if (dto.pago.documento_pagante) {
      this.pagosService.guardarDocumentoTemporal(
        orden.id,
        dto.pago.documento_pagante,
      );
    }

    await this.ordenService.actualizarEstado(orden.id, respuestaMp.status);

    const primerPago = respuestaMp?.transactions?.payments?.[0];
    const estadoDetalle =
      primerPago?.status_detail ?? respuestaMp.status_detail ?? '';
    const montoPagado =
      primerPago?.paid_amount ?? primerPago?.amount ?? String(total);

    if (esPagoAprobado(respuestaMp.status)) {
      // La factura no depende solo del webhook: se intenta aquí y, si el webhook llega después, no se duplica.
      // Un fallo de facturación no debe tumbar una compra ya cobrada.
      this.facturacionService.emitirSiNoExiste(orden.id).catch((e) => {
        this.logger.error(`No se pudo facturar la orden ${orden.id}: ${e}`);
      });

      const usuario = await this.authApiService.obtenerUsuario(orden.idusuario);

      if (usuario?.email) {
        await this.postPagoService.ejecutar({
          email: usuario.email,
          nombreUsuario: usuario.username ?? dto.pago.nombrepagante,
          nrcompra: pagoRegistrado?.nrcompra ?? orden.id,
          cursos: detalle.map((d) => d.nombrecurso),
          montoPagado,
          idusuario: dto.idusuario,
        });
      }
    }

    return {
      ordenId: orden.id,
      nrcompra: pagoRegistrado?.nrcompra ?? null,
      ordenMpId: respuestaMp.id,
      pagoMpId: primerPago?.id ?? '',
      estadoOrden: respuestaMp.status,
      estadoDetalle,
      montoPagado,
      fechaCreacion: respuestaMp.created_date ?? '',
    };
  }

  /** Consulta el catálogo y devuelve el detalle con los precios reales, comprobando el monto que dice el cliente. */
  private async resolverPrecioReal(
    dto: CrearVentaDto,
  ): Promise<{ detalle: DetalleReal[]; total: number }> {
    const ids = [...new Set(dto.detalleOrden.map((d) => d.idcurso))];
    const cursos = await Promise.all(
      ids.map((id) => this.cursoApiService.obtenerCurso(id)),
    );
    const catalogo = new Map<string, CursoDelCatalogo>(
      ids.map((id, i) => [id, cursos[i]]),
    );

    try {
      const real = calcularDetalleReal(dto.detalleOrden, catalogo);
      validarMonto(dto.pago.monto, real.total);
      return real;
    } catch (error) {
      if (error instanceof PrecioInvalidoError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Si Mercado Pago contestó con un error, el cobro no se hizo y la orden queda FALLIDA. Si no se pudo ni conectar,
   * no se sabe si se cobró: se deja PENDIENTE para revisarla después.
   */
  private async marcarOrdenSinCobro(
    idorden: number,
    error: unknown,
  ): Promise<void> {
    try {
      if (error instanceof BadGatewayException) {
        await this.ordenService.actualizarEstado(idorden, 'failed');
      } else {
        this.logger.warn(
          `Orden ${idorden} queda PENDIENTE: no se sabe si Mercado Pago llegó a cobrar (${(error as Error).message}).`,
        );
      }
    } catch (e) {
      this.logger.error(`No se pudo actualizar la orden ${idorden}: ${e}`);
    }
  }
}
