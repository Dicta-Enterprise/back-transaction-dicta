import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/services/prisma/prisma.module';
import { PagosModule } from './infraestructure/http/Order/pagos.module';
import { CarritoModule } from './infraestructure/http/Carrito-recovery/carrito.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule  ,
    PagosModule,
    CarritoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
