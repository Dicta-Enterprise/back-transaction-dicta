import { ConflictException, Injectable } from '@nestjs/common';
import { CrearCarritoDto } from 'src/application/dto/Carrito-recovery/create-carrito.dto';
import { Carrito } from 'src/core/entities/Carrito-recovery/carrito.entity';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

@Injectable()
export class CrearCarritoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CrearCarritoDto) {
    const carritoExistente = await this.prisma.carrito.findFirst({
      where: { idusuario: dto.idUsuario },
    });

    if (carritoExistente) {
      throw new ConflictException(
        `El usuario ${dto.idUsuario} ya tiene un carrito activo`
      );
    }

    const creado = await this.prisma.carrito.create({
      data: {
        idusuario: dto.idUsuario,
        cursos: {
          create: dto.cursos.map(c => ({
            idcurso: c.idcurso,
            nombrecurso: c.nombrecurso,
          })),
        },
      },
      include: { cursos: true },
    });

    return new Carrito(
      creado.id,
      creado.idusuario,
      creado.cursos.map(c => ({
        idcurso: c.idcurso,
        nombrecurso: c.nombrecurso,
      })),
    );
  }
}