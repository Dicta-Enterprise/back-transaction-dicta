import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/core/services/prisma/prisma.module'; 
import { MailerModule } from 'src/core/services/mailer/mailer.module'; 

import { OrdenService }        from 'src/core/services/Order/orden.service';
import { MercadoPagoService }  from 'src/core/services/Order/mercadopago.service';
import { PagosService }        from 'src/core/services/Order/pagos.service';
import { PagoMailerService }   from 'src/core/services/Order/pago-mailer.service'; 
import { FactusService }  from 'src/core/services/Facturacion/factus.service';

import { CrearOrdenYPagarUseCase } from 'src/application/uses-cases/Order/create-order.usecase';
import { EmitirFacturaElectronicaUseCase }  from 'src/application/uses-cases/Facturacion/emitir-factura-electronica.usecase';
import { OrdersController } from './order.controller'; 

import { WebhookMercadoPagoController }  from '../Webhook/Webhook.mercadopago.controller';
import { AuthApiService } from 'src/core/services/auth/auth-api.service';
import { CursoApiService } from 'src/core/services/curso/curso-api.service';
import { FacturacionService } from 'src/core/services/Facturacion/facturacion.service';
import { PostPagoService } from 'src/core/services/Order/post-pago.service';
import { SincronizacionPagosService } from 'src/core/services/Order/sincronizacion-pagos.service';
import { ConciliacionPagosService } from 'src/core/services/Order/conciliacion-pagos.service';
import { ConciliacionPagosScheduler } from './conciliacion-pagos.scheduler';

@Module({
  imports: [
    ConfigModule,   
    PrismaModule,
    MailerModule,   
  ],
  controllers: [
    OrdersController,
    WebhookMercadoPagoController,
  ],
  providers: [
  
    OrdenService,
    MercadoPagoService,
    PagosService,
    PagoMailerService,        
    FactusService,
    AuthApiService,
    CursoApiService,
    FacturacionService,
    PostPagoService,
    SincronizacionPagosService,
    ConciliacionPagosService,
    ConciliacionPagosScheduler,
    CrearOrdenYPagarUseCase,
    EmitirFacturaElectronicaUseCase,
  ],
  exports: [
    OrdenService,
    MercadoPagoService,
    PagosService,
    PagoMailerService,       
    FactusService,
    CrearOrdenYPagarUseCase,
    EmitirFacturaElectronicaUseCase,
  ],
})
export class PagosModule {}