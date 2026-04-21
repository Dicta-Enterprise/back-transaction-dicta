import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail, IsInt, IsISO8601, IsNotEmpty,
  IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min
} from 'class-validator';
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
 
  @ApiProperty({ example: 150.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
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
 
  @ApiProperty({ example: 'PEN' })
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
}