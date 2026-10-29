import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/core/services/prisma/prisma.module';
import { ComprasInternasController } from './compras-internas.controller';
import { ComprasInternasService } from 'src/core/services/Compras/compras-internas.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ComprasInternasController],
  providers: [ComprasInternasService],
})
export class ComprasInternasModule {}
