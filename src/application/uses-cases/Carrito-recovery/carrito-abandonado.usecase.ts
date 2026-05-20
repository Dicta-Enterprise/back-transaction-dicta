import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { CarritoMailerService } from 'src/core/services/Carrito-recovery/mailer.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'generated/prisma';

type CarritoConRelaciones = Prisma.carritoGetPayload<{
  include: {
    cursos: true;
    notificaciones: true;
    usuarios: {
      select: { id: true; email: true; username: true };
    };
  };
}>;

@Injectable()
export class CarritoAbandonadoUseCase {
  private readonly logger = new Logger(CarritoAbandonadoUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly carritoMailerService: CarritoMailerService,
    private readonly config: ConfigService,
  ) {}

  async ejecutar(): Promise<void> {
    const intervalos = this.config
      .get<string>('CARRITO_INTERVALOS_HORAS', '1,24,72,168')
      .split(',')
      .map(Number);

    const limite = new Date(
      Date.now() - intervalos[0] * 60 * 60 * 1000,
    );

    this.logger.log(`Buscando carritos sin actividad desde ${limite.toISOString()}`);

    const carritos = await this.prisma.carrito.findMany({
      where: {
        estado: 'PENDIENTE',
        updatedat: { lte: limite },
        cursos: { some: {} },
      },
      include: {
        cursos: true,
        notificaciones: true,
        usuarios: {
          select: { id: true, email: true, username: true },
        },
      },
    });

    this.logger.log(`Carritos encontrados: ${carritos.length}`);

    for (const carrito of carritos) {
      await this.notificar(carrito, intervalos);
    }
  }

  private async notificar(
    carrito: CarritoConRelaciones,
    intervalos: number[],
  ): Promise<void> {
    const { usuarios, cursos, id, notificaciones } = carrito;

    // cuántos recordatorios ya recibió
    const totalEnviados = notificaciones.length;

    // si ya recibió todos los recordatorios, ignorar
    if (totalEnviados >= intervalos.length) {
      this.logger.log(`Carrito ${id}: ya recibió todos los recordatorios`);
      return;
    }

    // verificar si ya pasó el tiempo del siguiente intervalo
    const siguienteIntervalo = intervalos[totalEnviados];
    const ultimaNotificacion = notificaciones[totalEnviados - 1];

    if (ultimaNotificacion) {
      const tiempoDesdeUltima = Date.now() - ultimaNotificacion.enviadoat.getTime();
      const intervaloEnMs = siguienteIntervalo * 60 * 60 * 1000;

      if (tiempoDesdeUltima < intervaloEnMs) {
        this.logger.log(`Carrito ${id}: aún no es tiempo del siguiente recordatorio`);
        return;
      }
    }

    try {
      const { messageId } = await this.carritoMailerService.enviarRecordatorio({
        nombreUsuario: usuarios.username ?? 'Usuario',
        email: usuarios.email!,
        totalCursos: cursos.length,
        urlCarrito: `${this.config.get('FRONTEND_URL')}/carrito`,
      });

      await this.prisma.notificacioncarrito.create({
        data: {
          idcarrito: id,
          messageid: messageId,
          secuencia: totalEnviados + 1,
        },
      });

      this.logger.log(`Recordatorio ${totalEnviados + 1}/${intervalos.length} enviado | carrito: ${id} | messageId: ${messageId}`);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error al notificar carrito ${id}: ${mensaje}`);
    }
  }
}