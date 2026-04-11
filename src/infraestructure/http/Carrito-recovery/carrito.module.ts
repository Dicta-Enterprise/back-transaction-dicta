import { Module } from '@nestjs/common';
import { CarritoController } from './carrito.controller';
import { CrearCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/create-carrito.usecase';
import { CarritoService } from 'src/core/services/Carrito-recovery/carrito.service';
import { ActualizarCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/update-carrito.usecase';
import { EliminarCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/delete-carrito.usecase';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { ObtenerCarritoUseCase } from 'src/application/uses-cases/Carrito-recovery/get-carrito.usecase';


@Module({
  controllers: [CarritoController],
  providers: [
    CarritoService,
    CrearCarritoUseCase,
    ActualizarCarritoUseCase,
    EliminarCarritoUseCase,
    PrismaService, 
    ObtenerCarritoUseCase,
  ],
})
export class CarritoModule {}