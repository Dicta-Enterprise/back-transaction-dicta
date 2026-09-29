import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  OrigenFacturacionGuard,
} from 'src/core/services/Facturacion/origen-facturacion.guard';
import {
  PrismaModule,
} from 'src/core/services/prisma/prisma.module';
import {
  AutenticacionFacturacionService,
} from 'src/core/services/Facturacion/autenticacion-facturacion.service';
import {
  DatosFacturacionService,
} from 'src/core/services/Facturacion/datos-facturacion.service';
import {
  SesionFacturacionGuard,
} from 'src/core/services/Facturacion/sesion-facturacion.guard';
import {
  DatosFacturacionController,
} from './datos-facturacion.controller';
import {
  ConsultaFacturasService,
} from 'src/core/services/Facturacion/consulta-facturas.service';
import { FacturasController } from './facturas.controller';
import {
  FactusService,
} from 'src/core/services/Facturacion/factus.service';
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  controllers: [
    DatosFacturacionController,
    FacturasController,
  ],
  providers: [
    AutenticacionFacturacionService,
    DatosFacturacionService,
    SesionFacturacionGuard,
    ConsultaFacturasService,
    FactusService,
    OrigenFacturacionGuard,
  ],
})
export class FacturacionModule {}