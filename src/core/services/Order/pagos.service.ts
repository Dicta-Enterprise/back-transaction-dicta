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
        fechapago: new Date(dto.fechapago),
        monto: new Prisma.Decimal(dto.monto),
        estado: this.mapearEstado(respuestaMp.status),
        nombrepagante: dto.nombrepagante,
        emailpagante: dto.emailpagante,
        moneda: dto.moneda,
        metodopago: dto.metodopago,
        tipotarjeta: dto.tipotarjeta,
        processing_mode: dto.processing_mode ?? 'automatic',
        transactionid: respuestaMp.id,
      },
    });
  }

  async obtenerPagoPorOrden(idorden: number): Promise<pagos | null> {
    return this.prisma.pagos.findUnique({ where: { idorden } });
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

  private mapearEstado(estadoMp: string): string {
    const mapa: Record<string, string> = {
      processed: 'COMPLETADO',
      action_required: 'PENDIENTE',
      pending: 'PENDIENTE',
      cancelled: 'CANCELADO',
      failed: 'FALLIDO',
    };
    return mapa[estadoMp] ?? 'PENDIENTE';
  }
}
