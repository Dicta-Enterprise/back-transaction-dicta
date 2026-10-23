import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
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

  @Post('resumen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Indica, por usuario, si ya compró y la fecha de su primera compra pagada (uso interno)' })
  async resumen(@Body() dto: ResumenComprasDto) {
    return this.comprasService.resumenPorUsuarios(dto.ids);
  }
}
