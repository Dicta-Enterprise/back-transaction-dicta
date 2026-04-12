import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from 'src/core/services/sale/sales.service';
import { PrismaModule } from 'src/core/services/prisma/prisma.module';
import { SALES_REPOSITORY } from 'src/core/constants/constants';
import { ValidatorService } from 'src/shared/application/validation/validator.service';
import { SalesPrismaRepository } from 'src/infraestructure/persistence/sale/sales.prisma.repository';
import { CreateSaleUseCase } from 'src/application/uses-cases/sale/create-sale.usecase';
import { ListSalesUseCase } from 'src/application/uses-cases/sale/list-sales.usecase';
import { MercadopagoService } from 'src/modules/payments/mercadopago.service';

@Module({
  imports: [PrismaModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    CreateSaleUseCase,
    ListSalesUseCase,
    ValidatorService,
    { provide: SALES_REPOSITORY, useClass: SalesPrismaRepository },
    MercadopagoService,
  ],
})
export class SalesModule {}