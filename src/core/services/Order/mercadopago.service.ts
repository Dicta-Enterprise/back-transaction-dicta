import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export interface CrearOrdenMpPayload {
  idorden: number;
  monto: number;
  emailpagante: string;
  metodopago: string;
  tipotarjeta: string;
  token: string;
  cuotas: number;
  moneda: string;
  processing_mode?: string;
}

export interface MpOrderResponse {
  id: string;
  status: string;
  status_detail: string;
  total_amount: string;
  total_paid_amount?: string;
  created_date?: string;
  last_updated_date?: string;
  transactions?: {
    payments?: {
      id?: string;
      amount?: string;
      paid_amount?: string;
      status?: string;
      status_detail?: string;
      payment_method?: {
        id?: string;
        type?: string;
        token?: string;
        installments?: number;
      };
    }[];
  };
}

@Injectable()
export class MercadoPagoService {
  private readonly baseUrl = 'https://api.mercadopago.com';
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.getOrThrow<string>('MP_ACCESS_TOKEN');
  }

  async crearOrdenPago(payload: CrearOrdenMpPayload): Promise<MpOrderResponse> {
    const bodyPayload = this.construirPayloadPayment(payload);

    try {
      const response = await fetch(`${this.baseUrl}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          'X-Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify(bodyPayload),
      });

      const raw = await response.json();

      if (!response.ok) {
        throw new BadGatewayException({
          mpStatus: raw?.status ?? 'failed',
          mpStatusDetail: raw?.status_detail ?? raw?.message ?? 'failed',
          mpCause: raw?.cause ?? [],
        });
      }

      return raw;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new InternalServerErrorException(
        'No se pudo conectar con MercadoPago.',
      );
    }
  }

  async consultarOrden(ordenMpId: string): Promise<MpOrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/orders/${ordenMpId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const raw = await response.json();

      if (!response.ok) {
        throw new BadGatewayException(
          `Error consultando orden MP [${response.status}]`,
        );
      }

      return raw as MpOrderResponse;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new InternalServerErrorException(
        'Error al consultar el estado del pago.',
      );
    }
  }

  private construirPayloadPayment(p: CrearOrdenMpPayload): object {
    return {
      transaction_amount: Number(p.monto),
      token: p.token,
      description: `Orden de compra #${p.idorden}`,
      installments: Number(p.cuotas),
      payment_method_id: p.metodopago,
      payer: {
        email: p.emailpagante,
      },
      external_reference: `orden-interna-${p.idorden}`,
    };
  }
}
