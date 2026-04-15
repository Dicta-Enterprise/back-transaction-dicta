import { Injectable, NotFoundException } from '@nestjs/common';
import { ActualizarCarritoDto } from 'src/application/dto/Carrito-recovery/update-carrito.dto';
import { Carrito } from 'src/core/entities/Carrito-recovery/carrito.entity';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

@Injectable()
export class ActualizarCarritoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: ActualizarCarritoDto) {
    const carritoDb = await this.prisma.carrito.findUnique({
      where: { id: dto.carritoId },
      include: { cursos: true },
    });

    if (!carritoDb) {
      throw new NotFoundException('Carrito no encontrado');
    }

    const carrito = new Carrito(
      carritoDb.id,
      carritoDb.idusuario,
      carritoDb.cursos.map(c => c.idcurso),
    );
    dto.cursosAgregar?.forEach(c => carrito.agregarCurso(c.idcurso));
    dto.cursosEliminar?.forEach(id => carrito.eliminarCurso(id));

    await this.prisma.carritoCurso.deleteMany({
      where: { carritoId: carrito.id! },
    });

    await this.prisma.carritoCurso.createMany({
      data: carrito.cursos.map(idcurso => ({
        carritoId: carrito.id!,
        idcurso,
      })),
      skipDuplicates: true,
    });

    return carrito;
  }
}