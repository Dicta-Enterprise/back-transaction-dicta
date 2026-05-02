import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export interface CrearOrdenMpPayload {
  idorden:          number;
  monto:            number;
  emailpagante:     string;
  metodopago:       string;
  tipotarjeta:      string;
  token:            string;
  cuotas:           number;
  moneda:           string;
  processing_mode?: string;
}

export interface MpOrderResponse {
  id:                string;
  status:            string;
  status_detail:     string;
  total_amount:      string;
  total_paid_amount?: string;
  created_date:      string;
  last_updated_date: string;
  transactions: {
    payments: {
      id:            string;
      amount:        string;
      paid_amount?:  string;
      status:        string;
      status_detail: string;
      payment_method: {
        id:           string;
        type:         string;
        token:        string;
        installments: number;
      };
    }[];
  };
}
function montoANumber(n: number): number {
  return Number(n.toFixed(2));
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly baseUrl = 'https://api.mercadopago.com';
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.getOrThrow<string>('MP_ACCESS_TOKEN');
  }

  async crearOrdenPago(payload: CrearOrdenMpPayload): Promise<MpOrderResponse> {
    const idempotencyKey = uuidv4();
    const body = this.construirPayload(payload);
    const bodyJson = JSON.stringify(body);

    this.logger.debug(`Payload JSON enviado a MP: ${bodyJson}`);
    this.logger.log(
      `POST /v1/orders | Orden interna: ${payload.idorden} | Idempotency: ${idempotencyKey}`,
    );

    try {
      const response = await fetch(`${this.baseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: bodyJson,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        this.logger.error(`MP error [${response.status}]: ${JSON.stringify(err)}`);
        throw new BadGatewayException(
          `MercadoPago rechazó la solicitud [${response.status}]: ${err?.message ?? 'Error desconocido'}`,
        );
      }

      const data = (await response.json()) as MpOrderResponse;

      this.logger.log(
        `Respuesta MP → Orden: ${data.id} | Estado: ${data.status} | Detalle: ${data.status_detail}`,
      );

      return data;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error('Error de red con MercadoPago', error);
      throw new InternalServerErrorException(
        'No se pudo conectar con el servicio de pagos. Intenta nuevamente.',
      );
    }
  }

  async consultarOrden(ordenMpId: string): Promise<MpOrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/orders/${ordenMpId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new BadGatewayException(
          `Error consultando orden MP [${response.status}]: ${err?.message ?? 'Error'}`,
        );
      }

      return (await response.json()) as MpOrderResponse;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new InternalServerErrorException('Error al consultar el estado del pago.');
    }
  }

  private construirPayload(p: CrearOrdenMpPayload): object {
    const monto = montoANumber(p.monto);

    return {
      type:               'online',
      processing_mode:    p.processing_mode ?? 'automatic',
      total_amount:       monto,
      external_reference: `orden-interna-${p.idorden}`,
      payer: {
        email: p.emailpagante,
      },
      transactions: {
        payments: [
          {
            amount: monto,
            payment_method: {
              id:           p.metodopago,
              type:         p.tipotarjeta,
              token:        p.token,
              installments: p.cuotas,
            },
          },
        ],
      },
    };
  }
}