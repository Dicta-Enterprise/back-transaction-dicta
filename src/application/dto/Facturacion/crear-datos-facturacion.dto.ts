import 
{
    ApiProperty,ApiPropertyOptional,
} 

from '@nestjs/swagger';

import {
  IsEmail,IsEnum,IsNotEmpty,IsOptional,IsString,Matches,
} from 'class-validator';
import { TipoDocumento } from 'generated/prisma';

export class CrearDatosFacturacionDto {
  @ApiProperty({ enum: TipoDocumento })
  @IsEnum(TipoDocumento)
  tipoDocumento!: TipoDocumento;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'numeroDocumento no puede contener solo espacios',
  })
  numeroDocumento!: string;

  @ApiPropertyOptional({
    description: 'Cuenta asociada cuyo permiso verificara el backend',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  idCuentaAsociada?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razonSocial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombres?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apellidos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departamento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  distrito?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}