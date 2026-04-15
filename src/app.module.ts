import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/services/prisma/prisma.module';
import { SalesModule } from './infraestructure/http/sale/sales.module';
import { CarritoModule } from './infraestructure/http/Carrito-recovery/carrito.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule  ,
    SalesModule,
    CarritoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
