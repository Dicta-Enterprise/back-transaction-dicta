import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { CarritoMailerService } from 'src/core/services/Carrito-recovery/mailer.service';
import { ConfigService } from '@nestjs/config';
import { Prisma } from 'generated/prisma';

type CarritoConRelaciones = Prisma.carritoGetPayload<{
  include: {
    cursos: true;
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
    const horas = this.config.get<number>('CARRITO_HORAS_INACTIVIDAD', 1);
    const limite = new Date(Date.now() - horas * 60 * 60 * 1000);

    this.logger.log(`Buscando carritos sin actividad desde ${limite.toISOString()}`);

    const carritos = await this.prisma.carrito.findMany({
      where: {
        estado: 'PENDIENTE',
        updatedat: { lte: limite },
        cursos: { some: {} },
        notificaciones: {
          none: {
            enviadoat: { gte: limite },
          },
        },
      },
      include: {
        cursos: true,
        usuarios: {
          select: { id: true, email: true, username: true },
        },
      },
    });

    this.logger.log(`Carritos abandonados encontrados: ${carritos.length}`);

    for (const carrito of carritos) {
      await this.notificar(carrito);
    }
  }

  private async notificar(carrito: CarritoConRelaciones): Promise<void> {
    const { usuarios, cursos, id } = carrito;

    try {
      await this.carritoMailerService.enviarRecordatorioCarrito({
        nombreUsuario: usuarios.username ?? 'Usuario',
        email: usuarios.email!,
        totalCursos: cursos.length,
        urlCarrito: `${this.config.get('FRONTEND_URL')}/carrito`,
      });

      await this.prisma.notificacioncarrito.create({
        data: { idcarrito: id },
      });

      this.logger.log(`Notificación registrada para carrito ${id}`);
    } catch (err) {
        const mensaje = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error al notificar carrito ${id}: ${mensaje}`);
    }
  }
}