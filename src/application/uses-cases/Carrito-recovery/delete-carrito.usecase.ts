import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

@Injectable()
export class EliminarCarritoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    const carritoExistente = await this.prisma.carrito.findUnique({
      where: { id },
    });

    if (!carritoExistente) {
      throw new NotFoundException(`Carrito con id ${id} no encontrado`);
    }

    await this.prisma.carrito.delete({
      where: { id },
    });

    return { message: 'Carrito eliminado' };
  }
}