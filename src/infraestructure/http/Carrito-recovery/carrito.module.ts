import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CarritoController } from './carrito.controller';
import { CarritoAbandonadoScheduler } from './carrito-abandonado.scheduler';
import { CrearCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/create-carrito.usecase';
import { ActualizarCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/update-carrito.usecase';
import { EliminarCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/delete-carrito.usecase';
import { ObtenerCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/get-carrito.usecase';
import { ObtenerCarritoPorUsuarioUseCase } from 'src/application/uses-cases/Carrito-recovery/get-carrito-by-user.usecase';
import { CarritoAbandonadoUseCase } from 'src/application/uses-cases/Carrito-recovery/carrito-abandonado.usecase';
import { CarritoService } from 'src/core/services/Carrito-recovery/carrito.service';
import { CarritoMailerService } from 'src/core/services/Carrito-recovery/mailer.service';
import { PrismaService } from 'src/core/services/prisma/prisma.service';

@Module({
  imports: [
    ConfigModule,
  ],
  controllers: [CarritoController],
  providers: [
    PrismaService,
    CarritoService,
    CarritoMailerService,
    CrearCarritoUseCase,
    ActualizarCarritoUseCase,
    EliminarCarritoUseCase,
    ObtenerCarritoUseCase,
    ObtenerCarritoPorUsuarioUseCase,
    CarritoAbandonadoUseCase,
    CarritoAbandonadoScheduler,
  ],
})
export class CarritoModule {}