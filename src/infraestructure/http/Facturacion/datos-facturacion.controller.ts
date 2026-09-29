import {
  BadRequestException,Body,
  Controller,Get,
  Param,
  Patch,Post,Req,UnauthorizedException,
  UseGuards,
  UsePipes,ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  DatosFacturacionService,
} from 'src/core/services/Facturacion/datos-facturacion.service';
import {
  SesionFacturacionGuard,
  SolicitudFacturacion,
} from 'src/core/services/Facturacion/sesion-facturacion.guard';
import {
  OrigenFacturacionGuard,
} from 'src/core/services/Facturacion/origen-facturacion.guard';
import {
  CrearDatosFacturacionDto,
} from 'src/application/dto/Facturacion/crear-datos-facturacion.dto';
import {
  ActualizarDatosFacturacionDto,
} from 'src/application/dto/Facturacion/actualizar-datos-facturacion.dto';

@ApiTags('Datos de facturacion')
@ApiCookieAuth()
@ApiUnauthorizedResponse({
  description: 'Sesion invalida',
})
@ApiServiceUnavailableResponse({
  description: 'No se pudo comprobar la sesion con Back Auth',
})
@Controller('datos-facturacion')
@UseGuards(SesionFacturacionGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class DatosFacturacionController {
  constructor(
    private readonly servicio: DatosFacturacionService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar mis datos personales de facturacion',
    description:
      'Devuelve los registros autorizados para el usuario autenticado',
  })
  @ApiOkResponse({
    description: 'Lista de datos de facturacion del usuario',
  })
  async obtener(@Req() solicitud: SolicitudFacturacion) {
    const contexto = solicitud.contextoFacturacion;

    if (!contexto) {
      throw new UnauthorizedException(
        'No se encontro una sesion validada',
      );
    }

    return this.servicio.obtener(contexto);
  }

  @Post()
  @UseGuards(OrigenFacturacionGuard)
  @ApiOperation({
    summary: 'Registrar mis datos personales de facturacion',
    description:
      'Requiere una sesion valida y un origen autorizado,no permite registrar datos para otras cuentas.',
  })
  @ApiCreatedResponse({
    description: 'Datos de facturacion registrados',
  })
  @ApiBadRequestResponse({
    description: 'Datos invalidos ',
  })
  @ApiForbiddenResponse({
    description: 'Origen no autorizado o cuenta sin permiso',
  })
  async crear(
    @Req() solicitud: SolicitudFacturacion,
    @Body() dto: CrearDatosFacturacionDto,
  ) {
    const contexto = solicitud.contextoFacturacion;

    if (!contexto) {
      throw new UnauthorizedException('Debes iniciar sesion');
    }

    return this.servicio.crear(contexto, dto);
  }

  @Patch(':id')
  @UseGuards(OrigenFacturacionGuard)
  @ApiOperation({
    summary: 'Actualizar mis datos de facturacion',
    description:
      'Actualiza los datos para futuras emisiones',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Identificador del registro de datos de facturacion',
  })
  @ApiOkResponse({
    description: 'Datos de facturacion actualizados',
  })
  @ApiBadRequestResponse({
    description: 'Datos invalidos',
  })
  @ApiForbiddenResponse({
    description: 'Origen no autorizado',
  })
  @ApiNotFoundResponse({
    description: 'Registro inexistente o sin acceso',
  })
  async actualizar(
    @Req() solicitud: SolicitudFacturacion,
    @Param('id') id: string,
    @Body() dto: ActualizarDatosFacturacionDto,
  ) {
    const contexto = solicitud.contextoFacturacion;

    if (!contexto) {
      throw new UnauthorizedException('Debes iniciar sesion');
    }

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'Debes enviar al menos un campo para actualizar',
      );
    }

    return this.servicio.actualizar(contexto, id, dto);
  }
}