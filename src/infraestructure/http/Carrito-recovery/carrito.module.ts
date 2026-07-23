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
import { CarritoMailerService } from 'src/core/services/Carrito-recovery/carrito-mailer.service';
import { PrismaService } from 'src/core/services/prisma/prisma.service';
import { MailerModule } from 'src/core/services/mailer/mailer.module';
import { WebhookController } from './webhook.controller';
import { WebhookBrevoUseCase } from 'src/application/uses-cases/Carrito-recovery/webhook-brevo.usecase';
import { AuthApiService } from 'src/core/services/auth/auth-api.service';

@Module({
  imports: [
    ConfigModule,
    MailerModule
  ],
  controllers: [CarritoController,
    WebhookController
  ],
  providers: [
    PrismaService,
    CarritoService,
    CarritoMailerService,
    AuthApiService,
    CrearCarritoUseCase,
    ActualizarCarritoUseCase,
    EliminarCarritoUseCase,
    ObtenerCarritoUseCase,
    ObtenerCarritoPorUsuarioUseCase,
    CarritoAbandonadoUseCase,
    CarritoAbandonadoScheduler,
    WebhookBrevoUseCase
  ],
})
export class CarritoModule {}