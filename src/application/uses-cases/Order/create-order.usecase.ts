import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';

import { CrearVentaDto } from 'src/application/dto/Order/create-orden.dto';
import { OrdenService } from 'src/core/services/Order/orden.service';
import { MercadoPagoService } from 'src/core/services/Order/mercadopago.service';
import { PagosService } from 'src/core/services/Order/pagos.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'generated/prisma';
import { PagoMailerService } from 'src/core/services/order/pago-mailer.service';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { AuthApiService } from 'src/core/services/auth/auth-api.service';

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
    private readonly pagoMailerService: PagoMailerService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authApiService: AuthApiService,
  ) {}

  async ejecutar(dto: CrearVentaDto): Promise<PagoResultado> {
    if (!dto.aceptoTerminos) {
      throw new BadRequestException(
        'Debes aceptar los Términos y Condiciones para realizar la compra.',
      );
    }
    
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

    if (dto.pago.documento_pagante) {
      this.pagosService.guardarDocumentoTemporal(
        orden.id,
        dto.pago.documento_pagante,
      );
    }

    await this.ordenService.actualizarEstado(orden.id, respuestaMp.status);

    const primerPago = respuestaMp?.transactions?.payments?.[0];
    const estadoDetalle = primerPago?.status_detail ?? respuestaMp.status_detail ?? '';


    if (respuestaMp.status === 'processed') {
      const usuario = await this.authApiService.obtenerUsuario(orden.idusuario);

      if (usuario?.email) {
        await this.onPagoExitoso({
          email: usuario.email,
          nombreUsuario: usuario.username ?? dto.pago.nombrepagante,
          nrcompra: pagoRegistrado?.nrcompra ?? orden.id,
          cursos: dto.detalleOrden.map((d) => d.nombrecurso),
          montoPagado: primerPago?.paid_amount ?? primerPago?.amount ?? '0',
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
      montoPagado: primerPago?.paid_amount ?? primerPago?.amount ?? '0',
      fechaCreacion: respuestaMp.created_date ?? '',
    };
  }

  private async onPagoExitoso(data: {
    email: string;
    nombreUsuario: string;
    nrcompra: number;
    cursos: string[];
    montoPagado: string;
    idusuario: number;
  }): Promise<void> {

    const resultados = await Promise.allSettled([
    this.pagoMailerService.moverACompradores(data.email),
    this.pagoMailerService.enviarConfirmacion({
      email: data.email,
      nombreUsuario: data.nombreUsuario,
      nrcompra: data.nrcompra,
      cursos: data.cursos,
      montoTotal: data.montoPagado,
      urlPlataforma: this.config.get('FRONTEND_URL', ''),
    }),
    this.prisma.carrito.deleteMany({
      where: { idusuario: data.idusuario },
    }),
  ]);

  resultados.forEach((r, i) => {
    if (r.status === 'rejected') {
      this.logger.error(`Fallo en acción post-pago [${i}]: ${r.reason}`);
    }
  });
}
  
}