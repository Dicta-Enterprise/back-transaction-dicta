import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  AutenticacionFacturacionService,
} from './autenticacion-facturacion.service';
import {
  ContextoFacturacion,
} from './contexto-facturacion';

export interface SolicitudFacturacion extends Request {
  contextoFacturacion?: ContextoFacturacion;
}

@Injectable()
export class SesionFacturacionGuard implements CanActivate {
  constructor(
    private readonly autenticacion: AutenticacionFacturacionService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const solicitud = context
      .switchToHttp()
      .getRequest<SolicitudFacturacion>();

    const cookies = (solicitud.headers.cookie ?? '')
      .split(';')
      .map((cookie) => cookie.trim())
      .filter((cookie) => cookie.startsWith('accessToken='));

    if (cookies.length !== 1) {
      throw new UnauthorizedException(
        'Debes iniciar sesion',
      );
    }

    let token: string;

    try {
      token = decodeURIComponent(
        cookies[0].slice('accessToken='.length),
      );
    } catch {
      throw new UnauthorizedException(
        'Cookie de sesion invalida',
      );
    }

    const usuario = await this.autenticacion.verificarToken(token);

    solicitud.contextoFacturacion = {
      idUsuario: usuario.idUsuario,
      cuentasConLectura: [],
      cuentasConEscritura: [],
    };

    return true;
  }
}