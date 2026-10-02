import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CrearVentaDto } from 'src/application/dto/Order/create-orden.dto';
import { CrearOrdenYPagarUseCase } from 'src/application/uses-cases/Order/create-order.usecase';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly createUseCase: CrearOrdenYPagarUseCase) {}

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

      const estadoExitoso = ['approved', 'processed'].includes(
        result.estadoOrden,
      );
      const estadoPendiente = [
        'pending',
        'action_required',
        'processing',
        'in_process',
      ].includes(result.estadoOrden);

      if (estadoExitoso) {
        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: 'Venta creada exitosamente',
        };
      }

      const resultData = result as unknown as Record<string, unknown>;
      const subStatusKey =
        resultData.estadoDetalle ||
        resultData.mpStatusDetail ||
        resultData.statusDetail ||
        'cc_rejected_other_reason';

      if (estadoPendiente) {
        throw new HttpException(
          {
            statusCode: HttpStatus.ACCEPTED,
            data: result,
            mpStatus: result.estadoOrden,
            mpStatusDetail: subStatusKey,
          },
          HttpStatus.ACCEPTED,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          data: result,
          mpStatus: result.estadoOrden,
          mpStatusDetail: subStatusKey,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    } catch (error) {
      if (error instanceof BadGatewayException) {
        const body = error.getResponse() as {
          mpStatus?: string;
          mpStatusDetail?: string;
        };
        const detailKey = body.mpStatusDetail ?? 'cc_rejected_other_reason';

        throw new HttpException(
          {
            statusCode: HttpStatus.PAYMENT_REQUIRED,
            mpStatus: body.mpStatus ?? 'rejected',
            mpStatusDetail: detailKey,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw new HttpException(
          { statusCode: 400, message: error.message, error: 'Bad Request' },
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        {
          statusCode: 500,
          message: error instanceof Error ? error.message : 'Error desconocido',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
