import {
  Controller,Get,
  Param,Query,
  Req,StreamableFile,
  UnauthorizedException,UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ListarFacturasDto,
} from 'src/application/dto/Facturacion/listar-facturas.dto';
import {
  ConsultaFacturasService,
} from 'src/core/services/Facturacion/consulta-facturas.service';
import {
  SesionFacturacionGuard,
  SolicitudFacturacion,
} from 'src/core/services/Facturacion/sesion-facturacion.guard';

@ApiTags('Facturas')
@ApiCookieAuth()
@Controller('facturas')
@UseGuards(SesionFacturacionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class FacturasController {
  constructor(
    private readonly servicio: ConsultaFacturasService,
  ) {}

  @Get()
  @ApiOperation({
  summary: 'Consultar mi historial de facturas',
  description:
    'Consulta las facturas del usuario autenticado con sus detalles, paginacion y filtros opcionales por estado del pago, tipo de comprobante, curso y fechas de emision las fechas se reciben en formato DD/MM/AAAA',
  })
@ApiOkResponse({
  description: 'Historial y paginacion obtenidos correctamente',
  })
@ApiBadRequestResponse({
  description: 'Paginacion, filtros o rango de fechas invalidos',
})
  @ApiUnauthorizedResponse({
    description: 'Sesion invalida',
  })
  @ApiServiceUnavailableResponse({
    description: 'No se pudo comprobar la sesion con Back Auth',
  })
  async listar(
    @Req() solicitud: SolicitudFacturacion,
    @Query() consulta: ListarFacturasDto,
  ) {
    const contexto = solicitud.contextoFacturacion;

    if (!contexto) {
      throw new UnauthorizedException('Debes iniciar sesion');
    }

    return this.servicio.listar(contexto, consulta);
  }

  @Get('descargar/todas')
  @ApiOperation({
    summary: 'Descargar mis facturas en un PDF consolidado',
    description:
      'Reune los comprobantes personales del usuario,si falta alguno informa el error',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'PDF consolidado con los comprobantes del usuario',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiNotFoundResponse({
    description: 'No hay facturas o falta alguno de los comprobantes',
  })
  @ApiUnauthorizedResponse({
    description: 'Sesion invalida',
  })
  @ApiBadGatewayResponse({
    description: 'No se pudo obtener o consolidar alguno de los PDF',
  })
  @ApiServiceUnavailableResponse({
    description: 'No se pudo comprobar la sesion con Back Auth',
  })
  async descargarTodas(
    @Req() solicitud: SolicitudFacturacion,
  ) {
    const contexto = solicitud.contextoFacturacion;

    if (!contexto) {
      throw new UnauthorizedException('Debes iniciar sesion');
    }

    const pdf = await this.servicio.descargarTodasPdf(contexto);

    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: 'attachment; filename="mis-facturas.pdf"',
      length: pdf.length,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar el detalle de una factura',
    description:
      'Consulta una factura cuyo propietario es el usuario autenticado, incluyendo cliente, cursos, importes, pago y referencia del documento',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identificador de la factura',
  })
  @ApiOkResponse({
    description: 'Detalle de la factura obtenido correctamente',
  })
  @ApiNotFoundResponse({
    description: 'Factura sin acceso autorizado',
  })
  @ApiUnauthorizedResponse({
    description: 'Sesion invalida',
  })
  @ApiServiceUnavailableResponse({
    description: 'No se pudo comprobar la sesion con Back Auth',
  })
  async obtenerPorId(
    @Req() solicitud: SolicitudFacturacion,
    @Param('id') id: string,
  ) {
    const contexto = solicitud.contextoFacturacion;

    if (!contexto) {
      throw new UnauthorizedException('Debes iniciar sesion');
    }

    return this.servicio.obtenerPorId(contexto, id);
  }

  @Get(':id/descargar')
@ApiOperation({
  summary: 'Descargar el PDF de una factura',
})
@ApiParam({
  name: 'id',
  type: String,
  description: 'Identificador de la factura',
})
@ApiProduces('application/pdf')
@ApiOkResponse({
  description: 'Documento PDF de la factura',
  schema: {
    type: 'string',
    format: 'binary',
  },
})
@ApiNotFoundResponse({
  description: 'Factura sin acceso',
})
@ApiUnauthorizedResponse({
  description: 'Sesion invalida',
})
@ApiBadGatewayResponse({
  description: 'No se pudo obtener el PDF desde Factus',
})
@ApiServiceUnavailableResponse({
  description: 'No se pudo comprobar la sesion con Back Auth',
})
async descargar(
  @Req() solicitud: SolicitudFacturacion,
  @Param('id') id: string,
) {
  const contexto = solicitud.contextoFacturacion;

  if (!contexto) {
    throw new UnauthorizedException('Debes iniciar sesion');
  }

  const pdf = await this.servicio.descargarPdf(contexto, id);

  return new StreamableFile(pdf, {
    type: 'application/pdf',
    disposition: 'attachment; filename="factura.pdf"',
    length: pdf.length,
  });
}

}