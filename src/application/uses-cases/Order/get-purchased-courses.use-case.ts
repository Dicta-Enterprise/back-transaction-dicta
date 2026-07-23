import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { Result } from 'src/shared/domain/result/result';

export interface PurchasedCoursesOutput {
  userId: number;
  totalCursos: number;
  cursos: string[];
}

@Injectable()
export class GetPurchasedCoursesUseCase {
  private readonly logger = new Logger(GetPurchasedCoursesUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: number): Promise<Result<PurchasedCoursesOutput>> {
    try {
      const ordenesCompletadas = await this.prisma.orden.findMany({
        where: {
          idusuario: userId,
          estado: 'COMPLETADO', // Estado que define una compra exitosa
        },
        include: {
          detalleorden: {
            select: {
              idcurso: true,
            },
          },
        },
      });

      // Extraer y aplanar los IDs de los cursos
      const cursosIds = ordenesCompletadas.flatMap(orden =>
        orden.detalleorden.map(detalle => detalle.idcurso),
      );

      // Eliminar duplicados usando un Set para asegurar que cada ID sea único
      const cursosUnicos = [...new Set(cursosIds)];

      const result: PurchasedCoursesOutput = {
        userId: userId,
        totalCursos: cursosUnicos.length,
        cursos: cursosUnicos,
      };
      
      return Result.ok(result);

    } catch{
      return Result.fail(new Error('Ocurrió un error inesperado al consultar los cursos.'));
    }
  }
}
