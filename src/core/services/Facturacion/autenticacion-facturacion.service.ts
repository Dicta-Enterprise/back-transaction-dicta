import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UsuarioFacturacion {
  idUsuario: number;
}

@Injectable()
export class AutenticacionFacturacionService {
  private readonly perfilUrl: string;

  constructor(config: ConfigService) {
    const baseUrl = config
      .getOrThrow<string>('AUTH_API_URL')
      .replace(/\/+$/, '');

    this.perfilUrl = `${baseUrl}/api/auth/profile`;
  }

  async verificarToken(
    token: string | undefined,
  ): Promise<UsuarioFacturacion> {
    const formatoJwt =
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

    if (
      !token ||
      token.length > 8192 ||
      !formatoJwt.test(token)
    ) {
      throw new UnauthorizedException(
        'Debes iniciar sesion',
      );
    }

    let respuesta: Response;

    try {
      respuesta = await fetch(this.perfilUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Cookie: `accessToken=${token}`,
        },
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo comprobar la sesion con Back Auth',
      );
    }

    if (
      respuesta.status === 401 ||
      respuesta.status === 403
    ) {
      throw new UnauthorizedException(
        'Sesion invalida o expirada',
      );
    }

    if (!respuesta.ok) {
      throw new ServiceUnavailableException(
        'Back Auth no pudo comprobar la sesion',
      );
    }

    let perfil: unknown;

    try {
      perfil = await respuesta.json();
    } catch {
      throw new ServiceUnavailableException(
        'Back Auth devolvio una respuesta invalida',
      );
    }

    if (
      typeof perfil !== 'object' ||
      perfil === null ||
      !('id' in perfil) ||
      typeof perfil.id !== 'number' ||
      !Number.isSafeInteger(perfil.id) ||
      perfil.id <= 0
    ) {
      throw new ServiceUnavailableException(
        'Back Auth no devolvio un usuario valido',
      );
    }

    return {
      idUsuario: perfil.id,
    };
  }
}