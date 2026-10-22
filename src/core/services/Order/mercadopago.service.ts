import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  claveIdempotencia,
  construirPayloadOrden,
  CrearOrdenMpPayload,
  parsearErrorMp,
} from './mp-orders';

export type { CrearOrdenMpPayload } from './mp-orders';

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

const TIMEOUT_CREAR_MS = 30_000;
const TIMEOUT_CONSULTAR_MS = 15_000;

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly baseUrl = 'https://api.mercadopago.com';
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.getOrThrow<string>('MP_ACCESS_TOKEN');
  }

  /**
   * Cobra con la API de Orders (POST /v1/orders). La orden local ya debe existir: su id es la referencia
   * externa y, junto con la clave de idempotencia, evita que un reintento cobre dos veces.
   *
   * Si Mercado Pago rechaza el pago (HTTP 402) lanza BadGatewayException con mpStatus "failed" y el motivo
   * en mpStatusDetail; si la petición misma falla (credenciales, datos) mpStatus es "error".
   */
  async crearOrdenPago(payload: CrearOrdenMpPayload): Promise<MpOrderResponse> {
    const cuerpo = construirPayloadOrden(payload);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          'X-Idempotency-Key': claveIdempotencia(payload.idorden),
        },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(TIMEOUT_CREAR_MS),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo conectar con Mercado Pago (orden ${payload.idorden}): ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException('No se pudo conectar con MercadoPago.');
    }

    const raw = await this.leerJson(response);

    if (!response.ok) {
      const error = parsearErrorMp(raw);
      this.logger.warn(
        `Mercado Pago respondió ${response.status} (orden ${payload.idorden}): ${error.mpStatus}/${error.mpStatusDetail}`,
      );
      throw new BadGatewayException({ ...error, httpStatus: response.status });
    }

    return raw as MpOrderResponse;
  }

  async consultarOrden(ordenMpId: string): Promise<MpOrderResponse> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/orders/${encodeURIComponent(ordenMpId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_CONSULTAR_MS),
      });
    } catch (error) {
      this.logger.error(`No se pudo consultar la orden ${ordenMpId}: ${(error as Error).message}`);
      throw new ServiceUnavailableException('No se pudo consultar el estado del pago.');
    }

    const raw = await this.leerJson(response);

    if (!response.ok) {
      const error = parsearErrorMp(raw);
      throw new BadGatewayException(
        `Error consultando orden MP [${response.status}] ${error.mpStatusDetail}`,
      );
    }

    return raw as MpOrderResponse;
  }

  private async leerJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
}
