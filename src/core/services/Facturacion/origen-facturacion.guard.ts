import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class OrigenFacturacionGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const solicitud = context.switchToHttp().getRequest<Request>();
    const origen = solicitud.get('origin');

    const permitidos = (
      this.config.get<string>('FACTURACION_ORIGENES_PERMITIDOS') ?? ''
    )
      .split(',')
      .map(valor => valor.trim())
      .filter(Boolean);

    if (!origen || !permitidos.includes(origen)) {
      throw new ForbiddenException(
        'Origen no autorizado para modificar datos de facturacion',
      );
    }

    return true;
  }
}