import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt,
  IsPositive, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DetalleOrdenDto } from './detalleorden.dto';
import { PagoDto } from './pago.dto';
 
export const EstadoOrden = {
  PENDIENTE:  'PENDIENTE',
  COMPLETADO: 'COMPLETADO',
  CANCELADO:  'CANCELADO',
  FALLIDO:    'FALLIDO',
} as const;
export type EstadoOrdenType = (typeof EstadoOrden)[keyof typeof EstadoOrden];
 
export class CrearVentaDto {
  @ApiProperty({ example: 42 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  idusuario!: number;                
 
  @ApiProperty({ example: 'PENDIENTE', enum: EstadoOrden })
  @IsEnum(EstadoOrden)
  estado!: EstadoOrdenType;

  @ApiProperty({ example: true })
  @IsBoolean()
  aceptoTerminos!: boolean;
 
  @ApiProperty({ type: [DetalleOrdenDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DetalleOrdenDto)
  detalleOrden!: DetalleOrdenDto[];

  @ApiProperty({ type: PagoDto })
  @ValidateNested()
  @Type(() => PagoDto)
  pago!: PagoDto;  
}
 