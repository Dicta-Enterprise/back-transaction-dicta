import { Injectable, Logger } from '@nestjs/common';
import { Result } from 'src/shared/domain/result/result';
import { OrdenService } from 'src/core/services/Order/orden.service';

export interface PurchasedCoursesOutput {
  userId: number;
  totalCursos: number;
  cursos: string[];
}

@Injectable()
export class GetPurchasedCoursesUseCase {
  private readonly logger = new Logger(GetPurchasedCoursesUseCase.name);

  constructor(private readonly ordenService: OrdenService) {}

  async execute(userId: number): Promise<Result<PurchasedCoursesOutput>> {
    try {
      const cursosUnicos = await this.ordenService.obtenerCursosComprados(userId);

      return Result.ok({
        userId,
        totalCursos: cursosUnicos.length,
        cursos: cursosUnicos,
      });
    } catch {
      return Result.fail(new Error('Ocurrió un error inesperado al consultar los cursos.'));
    }
  }
}