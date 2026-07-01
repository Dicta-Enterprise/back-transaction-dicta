import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/services/prisma/prisma.module';
import { PagosModule } from './infraestructure/http/Order/pagos.module';
import { CarritoModule } from './infraestructure/http/Carrito-recovery/carrito.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from './core/services/mailer/mailer.module';

import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule  ,
    MailerModule,
    PagosModule,
    CarritoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}