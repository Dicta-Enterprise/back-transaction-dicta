import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalApiKeyGuard } from 'src/shared/guard/internal-api-key.guard';
import { ResumenComprasDto } from 'src/application/dto/Compras/resumen-compras.dto';
import { ComprasInternasService } from 'src/core/services/Compras/compras-internas.service';

@ApiTags('Internal')
@ApiHeader({ name: 'x-internal-api-key', required: true, description: 'Clave compartida entre los servicios de Dicta.' })
@UseGuards(InternalApiKeyGuard)
@Controller('internal/compras')
export class ComprasInternasController {
  constructor(private readonly comprasService: ComprasInternasService) {}

  @Get('usuario/:idusuario')
  @ApiOperation({ summary: 'Detalle de las compras de un usuario: fecha, país, ciudad y si fue exitosa o no (uso interno)' })
  async detalleDeUsuario(@Param('idusuario', ParseIntPipe) idusuario: number) {
    return this.comprasService.detallePorUsuario(idusuario);
  }

  @Post('resumen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Indica, por usuario, si ya compró y la fecha de su primera compra pagada (uso interno)' })
  async resumen(@Body() dto: ResumenComprasDto) {
    return this.comprasService.resumenPorUsuarios(dto.ids);
  }
}
