import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CrearVentaDto } from 'src/application/dto/sale/create-sale.dto';
import { CreateSaleUseCase } from 'src/application/uses-cases/sale/create-sale.usecase';
import { ListSalesUseCase } from 'src/application/uses-cases/sale/list-sales.usecase';
import { MercadopagoService } from 'src/modules/payments/mercadopago.service';
import { Inject } from '@nestjs/common';
import { SALES_REPOSITORY } from 'src/core/constants/constants';
import { SalesRepository } from 'src/core/repositories/sale/sales.repository';

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(
    private readonly createUseCase: CreateSaleUseCase,
    private readonly listUseCase: ListSalesUseCase,
    private readonly mercadopagoService: MercadopagoService,
    @Inject(SALES_REPOSITORY)
    private readonly salesRepository: SalesRepository,
  ) {}

  // crear venta
  @Post()
  @ApiOperation({ summary: 'Crea una nueva venta (orden + detalle)' })
  @ApiBody({ type: CrearVentaDto })
  @ApiResponse({ status: 201, description: 'La venta fue creada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CrearVentaDto) {
    const result = await this.createUseCase.execute(dto);

    if (result.isFailure) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }

    return {
      status: HttpStatus.CREATED,
      data: result.getValue(),
      message: 'Venta creada',
    };
  }

  // pagar orden
  @Post(':id/pagar')
  async pagar(@Param('id') id: string) {
    const ordenId = parseInt(id);

    // obtener todas las ventas
    const ventas = await this.listUseCase.execute();

    if (ventas.isFailure) {
      throw new HttpException(ventas.error.message, HttpStatus.BAD_REQUEST);
    }

    const orden = ventas.getValue().find(v => v.id === ordenId);

    if (!orden) {
      throw new HttpException('Orden no encontrada', HttpStatus.NOT_FOUND);
    }

    // crear preferencia en Mercado Pago
    try{
      const respuesta = await this.mercadopagoService.crearPreferencia(orden);
      await this.salesRepository.updateMpid(orden.id, respuesta.id);
      return {
        status: HttpStatus.OK,
        url: respuesta.init_point,
        mpid: respuesta.id,
      };
    } catch{
      throw new HttpException('Error al generar pago', HttpStatus.BAD_GATEWAY);
    }
  }

  // listar ventas
  @Get()
  @ApiOperation({ summary: 'Lista todas las ventas con sus detalles' })
  @ApiBadRequestResponse({ description: 'Solicitud inválida' })
  async findAll() {
    const result = await this.listUseCase.execute();

    if (result.isFailure) {
      throw new HttpException(result.error.message, HttpStatus.BAD_REQUEST);
    }

    return {
      status: HttpStatus.OK,
      data: result.getValue(),
      message: 'Ventas obtenidas',
    };
  }
}