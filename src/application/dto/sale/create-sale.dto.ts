import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleOrdenDto {
  @ApiProperty({ example: 'abcr345' })
  @IsString()
  idCurso!: string;

  @ApiProperty({ example: 'Marketing Digital' })
  @IsString()
  nombreCurso!: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @IsPositive()
  precio!: number;
}

export class CrearVentaDto {
  @ApiProperty({ example: '42', description: 'ID del usuario (string desde el Front)' })
  @Type(() => Number)
  @IsInt()
  idUsuario!: number;

  @ApiProperty({ example: 'PEN' })
  @IsString()
  moneda!: string;

  @ApiProperty({ example: 450.0 })
  @IsNumber()
  @IsPositive()
  montoTotal!: number;

  @ApiProperty({ example: '2025-10-13T00:00:00.000Z' })
  @IsISO8601()
  fechaCreacion!: string;

  @ApiProperty({ example: 'PENDIENTE', enum: ['PENDIENTE', 'CANCELADO', 'APROBADO'] })
  @IsIn(['PENDIENTE', 'CANCELADO', 'APROBADO'])
  estadoOrden!: 'PENDIENTE' | 'CANCELADO' | 'APROBADO';

  @ApiProperty({ example: true, description: 'Se mapea a estado técnico CREATED/FAILED' })
  @IsBoolean()
  estado!: boolean;

  @ApiProperty({
    example: 'https://mi-cdn/qr/venta-1001.png',
    required: false,
    description: 'Código/URL del QR asociado a la orden',
  })
  @IsOptional()
  @IsString()
  codigoQR?: string;

  @ApiProperty({ type: [DetalleOrdenDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleOrdenDto)
  detalleOrden!: DetalleOrdenDto[];
}