import { Injectable, NotFoundException } from '@nestjs/common';
import { Carrito } from 'src/core/entities/Carrito-recovery/carrito.entity';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

@Injectable()
export class ObtenerCarritoPorUsuarioUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioId: number) {
    const usuarioExiste = await this.prisma.usuarios.findUnique({
      where: { id: usuarioId },
    });

    if (!usuarioExiste) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const carritoDb = await this.prisma.carrito.findFirst({
      where: { idusuario: usuarioId },
      include: { cursos: true },
    });

    if (!carritoDb) {
      throw new NotFoundException('Carrito no encontrado para este usuario');
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