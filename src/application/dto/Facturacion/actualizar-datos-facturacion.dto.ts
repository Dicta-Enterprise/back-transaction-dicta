import {
  ApiPropertyOptional,
  OmitType,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { TipoDocumento } from 'generated/prisma';
import { CrearDatosFacturacionDto } from './crear-datos-facturacion.dto';

export class ActualizarDatosFacturacionDto extends OmitType(
  CrearDatosFacturacionDto,
  [
    'idCuentaAsociada',
    'tipoDocumento',
    'numeroDocumento',
  ] as const,
) {
  @ApiPropertyOptional({ enum: TipoDocumento })
  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsEnum(TipoDocumento)
  tipoDocumento?: TipoDocumento;

  @ApiPropertyOptional({ example: '12345678' })
  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'numeroDocumento no puede contener solo espacios',
  })
  numeroDocumento?: string;
}