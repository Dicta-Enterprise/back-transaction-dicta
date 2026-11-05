import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UsuarioResponse {
  id: number;
  username: string;
  email: string;
}

@Injectable()
export class AuthApiService {
  private readonly baseUrl: string;
  private readonly internalApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.getOrThrow<string>('AUTH_API_URL');
    this.internalApiKey = this.config.getOrThrow<string>('INTERNAL_API_KEY');
  }

  async obtenerUsuario(id: number): Promise<UsuarioResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/internal/users/${id}`,
        { headers: { 'x-internal-api-key': this.internalApiKey } },
      );

      if (response.status === 404) {
        throw new NotFoundException('Usuario no encontrado en auth');
      }

      if (!response.ok) {
        throw new InternalServerErrorException(
          'Error consultando servicio de autenticación',
        );
      }

      return await response.json() as UsuarioResponse;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'No se pudo conectar con el servicio de autenticación.',
      );
    }
  }
}