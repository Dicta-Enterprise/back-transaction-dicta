import {Body,Controller,Get,HttpException,HttpStatus,Post,UsePipes,ValidationPipe,} from '@nestjs/common';
import {ApiBadRequestResponse,ApiBody,ApiOperation,ApiResponse,ApiTags,} from '@nestjs/swagger';

import { CrearVentaDto } from 'src/application/dto/sale/create-sale.dto';
import { CreateSaleUseCase } from 'src/application/uses-cases/sale/create-sale.usecase';
import { ListSalesUseCase } from 'src/application/uses-cases/sale/list-sales.usecase';

@ApiTags('sales')
@Controller('sales')
export class SalesController {
  constructor(
    private readonly createUseCase: CreateSaleUseCase,
    private readonly listUseCase: ListSalesUseCase,
  ) {}

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
      data: result,
      message: 'Ventas obtenidas',
    };
  }
}