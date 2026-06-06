import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsInt, IsISO8601, IsNotEmpty,
  IsOptional, IsPositive, IsString, MaxLength, Min
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
 
export class PagoDto {
  @ApiProperty({ example: 7, description: 'ID interno de la orden a pagar' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  idorden!: number;
 
  @ApiProperty({ example: '2025-10-13T00:00:00.000Z' })
  @IsISO8601()
  fechapago!: string;
 
  @ApiProperty({ example: 1500 })
  @Transform(({ value }) => Math.trunc(Number(value)))
  @IsInt()
  @IsPositive()
  monto!: number;
 
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombrepagante!: string;
 
  @ApiProperty({ example: 'juan@dominio.com' })
  @IsEmail()
  @MaxLength(150)
  emailpagante!: string;
 
  @ApiProperty({ example: 'COP' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  moneda!: string;
 
  @ApiProperty({ example: 'master', description: 'Bandera de tarjeta (visa, master…)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  metodopago!: string;
 
  @ApiProperty({ example: 'credit_card', enum: ['credit_card', 'debit_card'] })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  tipotarjeta!: string;
 
  @ApiProperty({ example: 'tok_abc123', description: 'Token de MercadoPago.js (un solo uso)' })
  @IsString()
  @IsNotEmpty()
  token!: string;
 
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cuotas!: number;
 
  @ApiPropertyOptional({ example: 'automatic', enum: ['automatic', 'manual'], default: 'automatic' })
  @IsOptional()
  processing_mode?: string;

  @ApiPropertyOptional({ example: '1234567890', description: 'Documento del pagante para factura electrónica' })
@IsOptional()
@IsString()
@MaxLength(20)
documento_pagante?: string;
}
 