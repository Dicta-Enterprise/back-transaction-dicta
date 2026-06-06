import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pagos, Prisma } from 'generated/prisma';
import { PagoDto } from 'src/application/dto/Order/Pago.dto';
import { MpOrderResponse } from './mercadopago.service';

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  async crearPago(
    idorden: number,
    dto: PagoDto,
    respuestaMp: MpOrderResponse,
  ): Promise<pagos> {
    const existente = await this.prisma.pagos.findUnique({ where: { idorden } });

    if (existente) {
      throw new ConflictException(
        `Ya existe un pago registrado para la orden ${idorden}`,
      );
    }

    return this.prisma.pagos.create({
      data: {
        idorden,
        fechapago:       new Date(dto.fechapago),
        monto:           new Prisma.Decimal(dto.monto),
        estado:          this.mapearEstado(respuestaMp.status),
        nombrepagante:   dto.nombrepagante,
        emailpagante:    dto.emailpagante,
        moneda:          dto.moneda,
        metodopago:      dto.metodopago,
        tipotarjeta:     dto.tipotarjeta,
        processing_mode: dto.processing_mode ?? 'automatic',
        transactionid:   respuestaMp.id,
      },
    });
  }

  async obtenerPagoPorOrden(idorden: number): Promise<pagos | null> {
    return this.prisma.pagos.findUnique({ where: { idorden } });
  }

  async obtenerPagoPorTransactionId(transactionid: string): Promise<pagos | null> {
    return this.prisma.pagos.findFirst({ where: { transactionid } });
  }

  async actualizarEstadoPago(
    idorden: number,
    estadoMp: string,
    transactionid?: string,
  ): Promise<pagos> {
    return this.prisma.pagos.update({
      where: { idorden },
      data: {
        estado: this.mapearEstado(estadoMp),
        transactionid,
      },
    });
  }

  async actualizarEstadoPorTransactionId(
    transactionid: string,
    estadoMp:      string,
  ): Promise<pagos | null> {
    const pago = await this.obtenerPagoPorTransactionId(transactionid);
    if (!pago) return null;

    return this.prisma.pagos.update({
      where: { id: pago.id },
      data:  { estado: this.mapearEstado(estadoMp) },
    });
  }


  async guardarDatosFactura(
    idorden: number,
    datos: {
      cufe:           string;
      numero_factura: string;
      factura_url?:   string | null;
    },
  ): Promise<pagos> {
    return this.prisma.pagos.update({
      where: { idorden },
      data: {
        cufe:           datos.cufe,
        numero_factura: datos.numero_factura,
        factura_url:    datos.factura_url ?? null,
      },
    });
  }

  private mapearEstado(estadoMp: string): string {
    const mapa: Record<string, string> = {
      processed:       'COMPLETADO',
      action_required: 'PENDIENTE',
      pending:         'PENDIENTE',
      cancelled:       'CANCELADO',
      failed:          'FALLIDO',
    };
    return mapa[estadoMp] ?? 'PENDIENTE';
  }
  private readonly documentoCache = new Map<number, string>();

guardarDocumentoTemporal(idorden: number, documento: string): void {
  this.documentoCache.set(idorden, documento);
  setTimeout(() => this.documentoCache.delete(idorden), 10 * 60 * 1000);
}

obtenerDocumentoTemporal(idorden: number): string | undefined {
  return this.documentoCache.get(idorden);
}
}

