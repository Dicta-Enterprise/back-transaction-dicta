import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacturaElectronicaPayload, FactusFacturaResponse, FactusTokenResponse } from  'src/core/entities/Facturacion/factus.interfaces';

@Injectable()
export class FactusService {
  private readonly logger = new Logger(FactusService.name);
  private readonly baseUrl = 'https://api-sandbox.factus.com.co';

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly config: ConfigService) {}


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
    const token = await this.obtenerToken();

    this.logger.log(`Emitiendo factura Factus | ref: ${payload.reference_code}`);

    try {
      const response = await fetch(`${this.baseUrl}/v1/bills/validate`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept':       'application/json',
        },
        body: JSON.stringify(payload),
      });

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

  async descargarPdf(numeroFactura: string): Promise<Buffer> {
    if (!numeroFactura?.trim()) {
      throw new NotFoundException('La factura no tiene un numero registrado en Factus');
    }

    const token  = await this.obtenerToken();
    const numero = encodeURIComponent(numeroFactura.trim());

    try {
      const response = await fetch(`${this.baseUrl}/v2/bills/${numero}/download-pdf`, {
        method:  'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept':        'application/json',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });

      if (response.status === 404) {throw new NotFoundException
        ('El PDF no esta disponible en Factus');}

      if (!response.ok) {throw new BadGatewayException
        ('Factus no pudo entregar el PDF');
      }

      const respuesta = await response.json() as {
        data?: {pdf_base_64_encoded?: unknown;};
      };

      const contenido = respuesta?.data?.pdf_base_64_encoded;

      if (typeof contenido !== 'string' || !contenido) {
        throw new BadGatewayException('Factus no devolvio el PDF');
      }

      const pdf = Buffer.from(contenido, 'base64');

      if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new BadGatewayException('El documento recibido no tiene una cabecera PDF valida');
      }

      return pdf;
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadGatewayException) throw err;
      throw new BadGatewayException('No se pudo descargar el PDF desde Factus');
    }
  }
}