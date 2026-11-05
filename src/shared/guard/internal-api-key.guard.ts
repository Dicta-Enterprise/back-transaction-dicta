import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';

export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';

const hash = (valor: string) => createHash('sha256').update(valor).digest();

// Protege los endpoints /internal: solo otros servicios de Dicta (que conocen la clave) pueden llamarlos.
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const enviada = request.headers?.[INTERNAL_API_KEY_HEADER];
    const esperada = this.config.getOrThrow<string>('INTERNAL_API_KEY');

    if (typeof enviada !== 'string' || !enviada) {
      throw new UnauthorizedException('Falta la clave interna.');
    }

    // Se comparan los hashes para que ambos midan lo mismo y la comparación no filtre información por tiempo.
    if (!timingSafeEqual(hash(enviada), hash(esperada))) {
      throw new UnauthorizedException('Clave interna inválida.');
    }

    return true;
  }
}
