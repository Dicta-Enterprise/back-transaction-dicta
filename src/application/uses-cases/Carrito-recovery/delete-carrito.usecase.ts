import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

@Injectable()
export class EliminarCarritoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    await this.prisma.carrito.delete({
      where: { id },
    });

    return { message: 'Carrito eliminado' };
  }
}