import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/core/services/prisma/prisma.module'; 

import { OrdenService }        from 'src/core/services/Order/orden.service';
import { MercadoPagoService }  from 'src/core/services/Order/mercadopago.service';
import { PagosService }        from 'src/core/services/Order/pagos.service';

import { CrearOrdenYPagarUseCase } from 'src/application/uses-cases/Order/create-order.usecase';
import { OrdersController } from './order.controller'; 
@Module({
  imports: [
    ConfigModule,   
    PrismaModule,   
  ],
  controllers: [OrdersController], 
  providers: [
    OrdenService,
    MercadoPagoService,
    PagosService,
    CrearOrdenYPagarUseCase,
  ],
  exports: [
    OrdenService,
    MercadoPagoService,
    PagosService,
    CrearOrdenYPagarUseCase,
  ],
})
export class PagosModule {}
