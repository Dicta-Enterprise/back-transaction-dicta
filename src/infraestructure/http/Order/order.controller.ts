import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
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

import { CrearVentaDto } from 'src/application/dto/Order/create-orden.dto';
import { CrearOrdenYPagarUseCase } from 'src/application/uses-cases/Order/create-order.usecase';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createUseCase: CrearOrdenYPagarUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crea una nueva venta (orden + detalle)' })
  @ApiBody({ type: CrearVentaDto })
  @ApiResponse({ status: 201, description: 'La venta fue creada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CrearVentaDto) {
    try {
      const result = await this.createUseCase.ejecutar(dto);

      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: 'Venta creada exitosamente',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new HttpException(
          { statusCode: HttpStatus.BAD_REQUEST, message: error.message, error: 'Bad Request' },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (error instanceof HttpException) throw error;

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error instanceof Error ? error.message : 'Error desconocido',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lista todas las ventas con sus detalles' })
  @ApiResponse({ status: 200, description: 'Lista de ventas obtenida exitosamente' })
  @ApiBadRequestResponse({ description: 'Solicitud inválida' })
  async findAll() {
    throw new HttpException(
      {
        statusCode: HttpStatus.NOT_IMPLEMENTED,
        message: 'El endpoint GET /orders aun no esta implementado',
        error: 'Not Implemented',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}