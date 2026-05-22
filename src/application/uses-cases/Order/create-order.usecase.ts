import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { CrearVentaDto } from 'src/application/dto/Order/create-orden.dto';
import { OrdenService } from 'src/core/services/Order/orden.service';
import { MercadoPagoService } from 'src/core/services/Order/mercadopago.service';
import { PagosService } from 'src/core/services/Order/pagos.service';
import { Prisma } from 'generated/prisma';

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
  constructor(
    private readonly ordenService: OrdenService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly pagosService: PagosService,
  ) {}

  async ejecutar(dto: CrearVentaDto): Promise<PagoResultado> {
    const montoEsperado = dto.detalleOrden.reduce(
      (acc, d) => acc.add(new Prisma.Decimal(d.precio)),
      new Prisma.Decimal(0),
    );

    const montoRecibido = new Prisma.Decimal(dto.pago.monto);

    if (montoRecibido.minus(montoEsperado).abs().greaterThan(new Prisma.Decimal('0.01'))) {
      throw new BadRequestException(
        `Monto inválido: se recibió ${montoRecibido} pero la suma de detalles es ${montoEsperado}`,
      );
    }

    const respuestaMp = await this.mercadoPagoService.crearOrdenPago({
      idorden: 0,
      monto: dto.pago.monto,
      emailpagante: dto.pago.emailpagante,
      metodopago: dto.pago.metodopago,
      tipotarjeta: dto.pago.tipotarjeta,
      token: dto.pago.token,
      cuotas: dto.pago.cuotas,
      moneda: dto.pago.moneda,
      processing_mode: dto.pago.processing_mode ?? 'automatic',
    });

    const orden = await this.ordenService.crearOrden(dto);

    const pagoRegistrado = await this.pagosService.crearPago(
      orden.id,
      dto.pago,
      respuestaMp,
    );

    await this.ordenService.actualizarEstado(orden.id, respuestaMp.status);

const primerPago = respuestaMp?.transactions?.payments?.[0];
const estadoDetalle = primerPago?.status_detail ?? respuestaMp.status_detail ?? '';

    return {
      ordenId: orden.id,
      nrcompra: pagoRegistrado?.nrcompra ?? null,
      ordenMpId: respuestaMp.id,
      pagoMpId: primerPago?.id ?? '',
      estadoOrden: respuestaMp.status,
      estadoDetalle,
      montoPagado: primerPago?.paid_amount ?? primerPago?.amount ?? '0',
      fechaCreacion: respuestaMp.created_date ?? '',
    };
  }
}