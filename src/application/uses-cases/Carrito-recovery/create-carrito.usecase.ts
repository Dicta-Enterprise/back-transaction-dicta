import { Injectable } from '@nestjs/common';
import { CrearCarritoDto } from 'src/application/dto/Carrito-recovery/create-carrito.dto';
import { Carrito } from 'src/core/entities/Carrito-recovery/carrito.entity';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

@Injectable()
export class CrearCarritoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CrearCarritoDto) {
    const carrito = new Carrito(
      null,
      dto.idUsuario,
      dto.cursos.map(c => c.idcurso),
    );

    const creado = await this.prisma.carrito.create({
      data: {
        idusuario: carrito.idUsuario,
        cursos: {
          create: carrito.cursos.map(idcurso => ({
            idcurso,
          })),
        },
      },
      include: { cursos: true },
    });

    return new Carrito(
      creado.id,
      creado.idusuario,
      creado.cursos.map(c => c.idcurso),
    );
  }
}