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

interface MpOrderRawResponse {
  errors?: { code: string; message: string; details: string[] }[];
  data?: MpOrderResponse;  
}

function montoAString(n: number): string {
  return Number(n.toFixed(2)).toString();
}

@Injectable()
export class MercadoPagoService {
  private readonly baseUrl = 'https://api.mercadopago.com';
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.getOrThrow<string>('MP_ACCESS_TOKEN');
  }

  async crearOrdenPago(payload: CrearOrdenMpPayload): Promise<MpOrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          'X-Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify(this.construirPayload(payload)),
      });

      const raw = await response.json() as MpOrderRawResponse;

      if (!response.ok) {
        const statusDetail =
          raw?.data?.transactions?.payments?.[0]?.status_detail ??
          raw?.data?.status_detail ??
          'failed';

        throw new BadGatewayException({
          mpStatus: raw?.data?.status ?? 'failed',
          mpStatusDetail: statusDetail,
        });
      }

      return raw.data ?? (raw as unknown as MpOrderResponse);

    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new InternalServerErrorException('No se pudo conectar con MercadoPago.');
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

      if (!response.ok) {
        throw new BadGatewayException(
          `Error consultando orden MP [${response.status}]`,
        );
      }

      return await response.json() as MpOrderResponse;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new InternalServerErrorException('Error al consultar el estado del pago.');
    }
  }

  private construirPayload(p: CrearOrdenMpPayload): object {
    const monto = montoAString(p.monto);

    return {
      type: 'online',
      processing_mode: p.processing_mode ?? 'automatic',
      total_amount: monto,
      external_reference: `orden-interna-${p.idorden}`,
      payer: {
        email: p.emailpagante,
      },
      transactions: {
        payments: [
          {
            amount: monto,
            payment_method: {
              id: p.metodopago,
              type: p.tipotarjeta,
              token: p.token,
              installments: p.cuotas,
            },
          },
        ],
      },
    };
  }
}