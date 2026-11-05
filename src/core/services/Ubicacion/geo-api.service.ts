import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { esIpPublica } from './ip-publica';

export interface UbicacionCompra {
  pais: string | null;
  ciudad: string | null;
  zonaHoraria: string | null;
}

// La ubicación es un dato accesorio de la compra: si back-auth tarda, se prescinde de ella.
const TIMEOUT_MS = 2_000;

/**
 * Pide a back-auth (que ya tiene el servicio de geolocalización) el país, la ciudad y la zona horaria de una IP.
 * Nunca lanza errores: una compra no debe fallar porque no se pudo ubicar a quien la hizo.
 */
@Injectable()
export class GeoApiService {
  private readonly logger = new Logger(GeoApiService.name);
  private readonly baseUrl: string;
  private readonly internalApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('AUTH_API_URL');
    this.internalApiKey = this.config.getOrThrow<string>('INTERNAL_API_KEY');
  }

  async ubicarIp(ip: string | null | undefined): Promise<UbicacionCompra | null> {
    if (!ip || !esIpPublica(ip)) {
      return null;
    }

    try {
      // La IP va en el cuerpo (POST) y no en la URL para que no quede escrita en los registros de acceso.
      const response = await fetch(`${this.baseUrl}/api/internal/geolocalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-api-key': this.internalApiKey },
        body: JSON.stringify({ ip }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`back-auth respondió ${response.status} al ubicar una IP`);
        return null;
      }

      const ubicacion = (await response.json()) as Partial<UbicacionCompra>;
      if (!ubicacion.pais && !ubicacion.ciudad) {
        return null;
      }

      return {
        pais: ubicacion.pais ?? null,
        ciudad: ubicacion.ciudad ?? null,
        zonaHoraria: ubicacion.zonaHoraria ?? null,
      };
    } catch (error) {
      this.logger.warn(`No se pudo ubicar la IP de la compra: ${(error as Error).message}`);
      return null;
    }
  }
}
