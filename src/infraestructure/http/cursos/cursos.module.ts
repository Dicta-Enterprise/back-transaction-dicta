import { Module } from '@nestjs/common';
import { CursosCompradosController } from './cursos-comprados.controller';
import { PrismaModule } from 'src/core/services/prisma/prisma.module';
import { GetPurchasedCoursesUseCase } from 'src/application/uses-cases/Order/get-purchased-courses.use-case';
import { OrdenService } from 'src/core/services/Order/orden.service';

@Module({
  imports: [PrismaModule],
  controllers: [CursosCompradosController],
  providers: [
    GetPurchasedCoursesUseCase,
    OrdenService,
  ],
})
export class CursosModule {}