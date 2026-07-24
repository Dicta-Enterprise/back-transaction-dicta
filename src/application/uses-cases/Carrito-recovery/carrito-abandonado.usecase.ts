import { Injectable, Logger } from '@nestjs/common';
import { CarritoMailerService } from 'src/core/services/Carrito-recovery/carrito-mailer.service';
import { ConfigService } from '@nestjs/config';
import { AuthApiService } from 'src/core/services/auth/auth-api.service';
import { Inject } from '@nestjs/common';
import { CARRITO_REPOSITORY } from 'src/core/constants/constants';
import { Carrito } from 'src/core/entities/Carrito-recovery/carrito.entity';
import { CarritoRepository } from 'src/core/repositories/carrito-repository';

@Injectable()
export class CarritoAbandonadoUseCase {
  private readonly logger = new Logger(CarritoAbandonadoUseCase.name);

  constructor(
    @Inject(CARRITO_REPOSITORY)
    private readonly carritoRepository: CarritoRepository,
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

  private async procesarIntervalo(minutos: number, intento: number): Promise<void> {
    const ahora = new Date();
    const desde = new Date(ahora.getTime() - (minutos + 1) * 60 * 1000);
    const hasta = new Date(ahora.getTime() - minutos * 60 * 1000);

    const carritos = await this.carritoRepository.findAbandonados(desde, hasta);

    for (const carrito of carritos) {
      await this.notificar(carrito, intento);
    }
  }

  private async notificar(carrito: Carrito, intento: number): Promise<void> {
    let usuario;

    try {
      usuario = await this.authApiService.obtenerUsuario(carrito.idUsuario);
    } catch {
      this.logger.error(`No se pudo obtener el usuario ${carrito.idUsuario}`);
      return;
    }

    if (!usuario.email) {
      this.logger.warn(`Carrito ${carrito.id} sin información del usuario`);
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

      this.logger.log(`Correo ${intento} enviado | carrito: ${carrito.id}`);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error al notificar carrito ${carrito.id}: ${mensaje}`);
    }
  }
}