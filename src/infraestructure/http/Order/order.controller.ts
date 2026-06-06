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
  @ApiResponse({ status: 201, description: 'Pago aprobado, venta creada.' })
  @ApiResponse({ status: 202, description: 'Pago pendiente de confirmación.' })
  @ApiResponse({ status: 402, description: 'Pago rechazado por MercadoPago.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor.' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() dto: CrearVentaDto) {
    try {
      const result = await this.createUseCase.ejecutar(dto);

      const estadoExitoso   = result.estadoOrden === 'processed';
      const estadoPendiente = ['pending', 'action_required', 'processing'].includes(result.estadoOrden);

      if (estadoExitoso) {
        return {
          statusCode: HttpStatus.CREATED,
          data:       result,
          message:    'Venta creada exitosamente',
        };
      }

      if (estadoPendiente) {
        throw new HttpException(
          { statusCode: 202, data: result, message: 'Pago pendiente de confirmación' },
          HttpStatus.ACCEPTED,
        );
      }

      throw new HttpException(
        { statusCode: 402, data: result, message: 'Pago rechazado' },
        HttpStatus.PAYMENT_REQUIRED,
      );

    } catch (error) {
      if (error instanceof HttpException) throw error;

      if (error instanceof BadRequestException) {
        throw new HttpException(
          { statusCode: 400, message: error.message, error: 'Bad Request' },
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        {
          statusCode: 500,
          message:    error instanceof Error ? error.message : 'Error desconocido',
          error:      'Internal Server Error',
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
        message:    'El endpoint GET /orders aun no esta implementado',
        error:      'Not Implemented',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}