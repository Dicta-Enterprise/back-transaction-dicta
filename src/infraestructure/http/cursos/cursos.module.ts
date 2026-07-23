import { Module } from '@nestjs/common';
import { CursosCompradosController } from './cursos-comprados.controller';
import { PrismaModule } from 'src/core/services/prisma/prisma.module';
import { GetPurchasedCoursesUseCase } from 'src/application/uses-cases/Order/get-purchased-courses.use-case';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    CursosCompradosController,
  ],
  providers: [
    GetPurchasedCoursesUseCase,
  ],
})
export class CursosModule {}