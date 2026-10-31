import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacturaElectronicaPayload, FactusFacturaResponse, FactusTokenResponse } from  'src/core/entities/Facturacion/factus.interfaces';

@Injectable()
export class FactusService {
  private readonly logger = new Logger(FactusService.name);
  // Por defecto el sandbox de Factus; en producción se define FACTUS_BASE_URL.
  private readonly baseUrl: string;
  private static readonly TIMEOUT_MS = 20_000;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('FACTUS_BASE_URL', 'https://api-sandbox.factus.com.co').replace(/\/+$/, '');
  }


  async obtenerToken(): Promise<string> {
    const ahora = Date.now();

    if (this.cachedToken && ahora < this.tokenExpiresAt - 60_000) {
      return this.cachedToken;
    }

    const username     = this.config.getOrThrow<string>('FACTUS_USERNAME');
    const password     = this.config.getOrThrow<string>('FACTUS_PASSWORD');
    const clientId     = this.config.getOrThrow<string>('FACTUS_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('FACTUS_CLIENT_SECRET');
   

    const body = new URLSearchParams({
      grant_type:    'password',
      username,
      password,
      client_id:     clientId,
      client_secret: clientSecret,
    });

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
        signal:  AbortSignal.timeout(FactusService.TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Error autenticando en Factus [${response.status}]: ${errorText}`);
        throw new BadGatewayException('No se pudo autenticar con Factus');
      }

      const data = await response.json() as FactusTokenResponse;

      this.cachedToken    = data.access_token;
      this.tokenExpiresAt = ahora + (data.expires_in ?? 3600) * 1_000;

      this.logger.log('Token Factus obtenido correctamente');
      return this.cachedToken;
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new InternalServerErrorException('Error de conexión con Factus');
    }
  }


  async emitirFactura(payload: FacturaElectronicaPayload): Promise<FactusFacturaResponse> {
    this.logger.log(`Emitiendo factura Factus | ref: ${payload.reference_code}`);

    try {
      let response = await this.enviarFactura(payload, await this.obtenerToken());

      // Si el token guardado ya no sirve (venció antes de lo esperado), se pide uno nuevo y se reintenta una vez.
      if (response.status === 401) {
        this.cachedToken = null;
        this.tokenExpiresAt = 0;
        response = await this.enviarFactura(payload, await this.obtenerToken());
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        this.logger.error(
          `Factus rechazó la factura [${response.status}]: ${JSON.stringify(errorData)}`,
        );
        throw new BadGatewayException(
          `Factus rechazó la factura [${response.status}]: ${JSON.stringify(errorData)}`,
        );
      }

      const data = await response.json() as FactusFacturaResponse;

      this.logger.log(
        `Factura emitida OK | CUFE: ${data.data?.bill?.cufe ?? 'N/A'} | #: ${data.data?.bill?.number ?? 'N/A'}`,
      );
      return data;
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new InternalServerErrorException('Error al emitir factura en Factus');
    }
  }

  private enviarFactura(payload: FacturaElectronicaPayload, token: string): Promise<Response> {
    return fetch(`${this.baseUrl}/v1/bills/validate`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(FactusService.TIMEOUT_MS),
    });
  }
}
