import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform,Type  } from 'class-transformer';
import { DetalleOrdenDto } from './Details-sale.dto';
import { EstadoOrden, type EstadoOrdenType } from 'src/shared/enums/estado-orden.enum';

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
  montoTotal!: number;

  @ApiProperty({ example: '2025-10-13T00:00:00.000Z' })
  @IsISO8601()
  fechaCreacion!: string;

  @ApiProperty({ example: 'PENDIENTE', enum: EstadoOrden })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value
  )
  @IsEnum(EstadoOrden)
  estadoOrden!: EstadoOrdenType;

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