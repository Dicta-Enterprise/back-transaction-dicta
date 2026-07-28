import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { Carrito } from 'src/core/entities/Carrito-recovery/carrito.entity';
import { CarritoRepository } from 'src/core/repositories/carrito-repository';

@Injectable()
export class CarritoPrismaRepository implements CarritoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAbandonados(desde: Date, hasta: Date): Promise<Carrito[]> {
    const data = await this.prisma.carrito.findMany({
      where: {
        updatedat: { gte: desde, lte: hasta },
        cursos: { some: {} },
      },
      include: { cursos: true },
    });
    return data.map(c => Carrito.fromPrisma(c));
  }
}