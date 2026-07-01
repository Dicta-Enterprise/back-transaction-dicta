import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FactusService } from 'src/core/services/Facturacion/factus.service';
import { FacturaElectronicaPayload, FacturaItem, FactusFacturaResponse } from 'src/core/entities/Facturacion/factus.interfaces';
import { OrdenConDetalle } from 'src/core/services/Order/orden.service';
import { pagos } from 'generated/prisma';
import { FacturaClienteDto } from 'src/application/dto/Order/factura-cliente.dto';

export interface EmitirFacturaInput {
  orden:         OrdenConDetalle;
  pago:          pagos;
  cliente?:      FacturaClienteDto;
  documento_pagante?: string;
}


@Injectable()
export class EmitirFacturaElectronicaUseCase {
  private readonly logger = new Logger(EmitirFacturaElectronicaUseCase.name);

  constructor(
    private readonly factusService: FactusService,
    private readonly config:        ConfigService,
  ) {}

  async ejecutar(input: EmitirFacturaInput): Promise<FactusFacturaResponse> {
    const { orden, pago, cliente } = input;

    this.logger.log(`Emitiendo factura para Orden #${orden.id} | Pago #${pago.id}`);

    const payload = this.construirPayload(orden, pago, cliente);
    const respuesta = await this.factusService.emitirFactura(payload);

    this.logger.log(
      `Factura electrónica emitida | Orden=${orden.id} | CUFE=${respuesta.data?.bill?.cufe}`,
    );

    return respuesta;
  }

  private construirPayload(
    orden:    OrdenConDetalle,
    pago:     pagos,
    cliente?: FacturaClienteDto,
    documento_pagante?: string,
  ): FacturaElectronicaPayload {

 
    const numberingRangeId  = Number(this.config.getOrThrow<string>('FACTUS_NUMBERING_RANGE_ID'));
    const establishmentName = this.config.getOrThrow<string>('FACTUS_ESTABLISHMENT_NAME');
    const establishmentAddr = this.config.getOrThrow<string>('FACTUS_ESTABLISHMENT_ADDRESS');
    const establishmentPhone= this.config.getOrThrow<string>('FACTUS_ESTABLISHMENT_PHONE');
    const establishmentEmail= this.config.getOrThrow<string>('FACTUS_ESTABLISHMENT_EMAIL');
    const municipalityId    = Number(this.config.getOrThrow<string>('FACTUS_MUNICIPALITY_ID'));


    const customerIdentification = documento_pagante ?? '222222222222';
    const customerNames          = cliente?.names          ?? pago.nombrepagante ?? 'Consumidor Final';
    const customerEmail          = cliente?.email          ?? pago.emailpagante;
    const customerAddress        = cliente?.address        ?? 'No aplica';
    const customerPhone          = cliente?.phone          ?? '0000000000';
    const legalOrganizationId    = cliente?.legal_organization_id    ?? '2';
    const tributeId              = cliente?.tribute_id               ?? '21';
    const identDocumentId        = cliente?.identification_document_id ?? 3;
    const customerMunicipality   = cliente?.municipality_id ?? municipalityId;

    const items: FacturaItem[] = orden.detalleorden.map((d) => ({
      code_reference:   `ORD-${orden.id}-PAG-${pago.id}-${Date.now()}`,
      name:             d.nombrecurso,
      quantity:         1,
      price:            Number(d.precio),
      discount_rate:    0,
      unit_measure_id:  70,   // codigo de la dian para "unidad" 
      standard_code_id: 1,     
      is_excluded:      1,     
      tax_rate:         0,
      tribute_id:       1,     // 4 = Excluido de IVA (servicio educativo) 
      
    }));

    return {
      document:            '01',
      numbering_range_id:  numberingRangeId,
      reference_code:      `ORD-${orden.id}-PAG-${pago.id}-${Date.now()}`,
      observation:         `Pago online — Orden #${orden.id}`,
      payment_method_code: this.mapearMetodoPago(pago.metodopago),
      send_email:          1,           
      email:               customerEmail, 

      establishment: {
        name:            establishmentName,
        address:         establishmentAddr,
        phone_number:    establishmentPhone,
        email:           establishmentEmail,
        municipality_id: municipalityId,
      },

      customer: {
        identification:             customerIdentification,
        dv:                         cliente?.dv,
        company:                    cliente?.company ?? '',
        trade_name:                 '',
        names:                      customerNames,
        address:                    customerAddress,
        email:                      customerEmail,
        phone:                      customerPhone,
        legal_organization_id:      legalOrganizationId,
        tribute_id:                 tributeId,
        identification_document_id: identDocumentId,
        municipality_id:            customerMunicipality,
      },

      items,
    };
  }

 
  private mapearMetodoPago(metodopago: string): string {
    const mapa: Record<string, string> = {
      visa:       '42', 
      master:     '42',
      mastercard: '42',
      amex:       '42',
      pse:        '47', 
      efectivo:   '10',
      cash:       '10',
    };
    return mapa[metodopago?.toLowerCase()] ?? '42';
  }
}
