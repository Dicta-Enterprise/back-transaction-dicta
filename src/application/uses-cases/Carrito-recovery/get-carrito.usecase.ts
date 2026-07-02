import { Injectable, NotFoundException } from '@nestjs/common';
import { Carrito } from 'src/core/entities/Carrito-recovery/carrito.entity';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

@Injectable()
export class ObtenerCarritoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(carritoId: number) {
    const carritoDb = await this.prisma.carrito.findUnique({
      where: { id: carritoId },
      include: { cursos: true },
    });

    if (!carritoDb) {
      throw new NotFoundException('Carrito no encontrado');
    }

    return new Carrito(
      carritoDb.id,
      carritoDb.idusuario,
      carritoDb.cursos.map(c => ({
        idcurso: c.idcurso,
        nombrecurso: c.nombrecurso,
      })),
    );
  }
}