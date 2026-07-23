import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { CarritoMailerService } from 'src/core/services/Carrito-recovery/carrito-mailer.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'generated/prisma';
import { AuthApiService } from 'src/core/services/auth/auth-api.service';

type CarritoConCursos = Prisma.carritoGetPayload<{
  include: {
    cursos: true;
  };
}>;

@Injectable()
export class CarritoAbandonadoUseCase {
  private readonly logger = new Logger(CarritoAbandonadoUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly carritoMailerService: CarritoMailerService,
    private readonly config: ConfigService,
    private readonly authApiService: AuthApiService,
  ) {}

  async ejecutar(): Promise<void> {
    const intervalos = this.config
      .get<string>('CARRITO_INTERVALOS_MINUTOS', '20,1440,4320')
      .split(',')
      .map(Number);

    for (let intento = 1; intento <= intervalos.length; intento++) {
      await this.procesarIntervalo(intervalos[intento - 1], intento);
    }
  }

  private async procesarIntervalo(minutos: number, intento: number,
): Promise<void> {
    const ahora = new Date();
    const desde = new Date(ahora.getTime() - (minutos + 1) * 60 * 1000);
    const hasta = new Date(ahora.getTime() - minutos * 60 * 1000);

    const carritos = await this.prisma.carrito.findMany({
      where: {
        updatedat: { gte: desde, lte: hasta },
        cursos: { some: {} },
      },
      include: {
        cursos: true,
      },
    });

    for (const carrito of carritos) {
      await this.notificar(carrito, intento);
    }
  }

  private async notificar(carrito: CarritoConCursos, intento: number): Promise<void> {
    let usuario;

    try {
      usuario = await this.authApiService.obtenerUsuario(carrito.idusuario);
    } catch {
      this.logger.error(
        `No se pudo obtener el usuario ${carrito.idusuario}`,
      );
      return;
    }

    if (!usuario.email) {
      this.logger.warn(
        `Carrito ${carrito.id} sin información del usuario`,
      );
      return;
    }

    try {
      await this.carritoMailerService.enviarRecordatorio({
        intento,
        nombreUsuario: usuario.username ?? 'Usuario',
        email: usuario.email,
        totalCursos: carrito.cursos.length,
        nombresCursos: carrito.cursos.map(c => c.nombrecurso),
        urlCarrito: `${this.config.get('FRONTEND_URL')}/cart`,
      });

      this.logger.log(
        `Correo ${intento} enviado | carrito: ${carrito.id}`,
      );
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error al notificar carrito ${carrito.id}: ${mensaje}`);
    }
  }
}