import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/core/services/prisma/prisma.module'; 
import { MailerModule } from 'src/core/services/mailer/mailer.module'; // 👈

import { OrdenService }        from 'src/core/services/Order/orden.service';
import { MercadoPagoService }  from 'src/core/services/Order/mercadopago.service';
import { PagosService }        from 'src/core/services/Order/pagos.service';
import { PagoMailerService }   from 'src/core/services/order/pago-mailer.service'; // 👈

import { CrearOrdenYPagarUseCase } from 'src/application/uses-cases/Order/create-order.usecase';
import { OrdersController } from './order.controller'; 

@Module({
  imports: [
    ConfigModule,   
    PrismaModule,
    MailerModule,   
  ],
  controllers: [OrdersController], 
  providers: [
    OrdenService,
    MercadoPagoService,
    PagosService,
    PagoMailerService,        
    CrearOrdenYPagarUseCase,
  ],
  exports: [
    OrdenService,
    MercadoPagoService,
    PagosService,
    PagoMailerService,       
    CrearOrdenYPagarUseCase,
  ],
})
export class PagosModule {}