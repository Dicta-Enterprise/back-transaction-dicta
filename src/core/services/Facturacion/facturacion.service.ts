import { Injectable, Logger } from '@nestjs/common';
import { EmitirFacturaElectronicaUseCase } from 'src/application/uses-cases/Facturacion/emitir-factura-electronica.usecase';
import { OrdenService } from 'src/core/services/Order/orden.service';
import { PagosService } from 'src/core/services/Order/pagos.service';
import { EstadoLocal } from 'src/core/services/Order/estado-mp';

export type ResultadoFacturacion =
  | 'emitida'
  | 'ya_existia'
  | 'en_curso'
  | 'sin_datos'
  | 'orden_no_pagada';

/**
 * Emite la factura electrónica de una orden pagada SIN duplicarla.
 *
 * Mercado Pago puede avisar varias veces de la misma orden (order.updated, order.processed, reintentos) y,
 * además, la factura se intenta al cobrar y desde el webhook. Por eso antes de emitir se comprueba:
 *  - que la orden esté COMPLETADA (no se factura un pago pendiente o fallido),
 *  - que el pago no tenga ya número de factura o CUFE,
 *  - que no haya otra emisión en curso para la misma orden en este proceso.
 * Además el código de referencia que va a Factus es siempre el mismo para la misma orden y pago.
 */
@Injectable()
export class FacturacionService {
  private readonly logger = new Logger(FacturacionService.name);
  private readonly enCurso = new Set<number>();

  constructor(
    private readonly ordenService: OrdenService,
    private readonly pagosService: PagosService,
    private readonly emitirFacturaUseCase: EmitirFacturaElectronicaUseCase,
  ) {}

  async emitirSiNoExiste(idOrden: number): Promise<ResultadoFacturacion> {
    if (this.enCurso.has(idOrden)) {
      this.logger.log(`Factura de la orden ${idOrden} ya se está emitiendo, se omite el segundo intento.`);
      return 'en_curso';
    }

    this.enCurso.add(idOrden);
    try {
      const [orden, pago] = await Promise.all([
        this.ordenService.obtenerOrdenPorId(idOrden),
        this.pagosService.obtenerPagoPorOrden(idOrden),
      ]);

      if (!orden || !pago) {
        this.logger.warn(`No se encontraron datos para facturar la orden ${idOrden}`);
        return 'sin_datos';
      }

      if (orden.estado !== EstadoLocal.COMPLETADO) {
        this.logger.warn(`La orden ${idOrden} está ${orden.estado}: no se factura.`);
        return 'orden_no_pagada';
      }

      if (pago.numero_factura || pago.cufe) {
        this.logger.log(`La orden ${idOrden} ya tiene factura (#${pago.numero_factura ?? 'sin número'}).`);
        return 'ya_existia';
      }

      const respuesta = await this.emitirFacturaUseCase.ejecutar({
        orden,
        pago,
        documento_pagante: this.pagosService.obtenerDocumentoTemporal(pago.idorden),
      });

      await this.pagosService.guardarDatosFactura(pago.idorden, {
        cufe: respuesta.data.bill.cufe,
        numero_factura: respuesta.data.bill.number,
        factura_url: respuesta.data.bill.public_url,
      });

      this.logger.log(
        `Factura electrónica | Orden=${idOrden} | #${respuesta.data.bill.number} | CUFE=${respuesta.data.bill.cufe}`,
      );
      return 'emitida';
    } finally {
      this.enCurso.delete(idOrden);
    }
  }
}
