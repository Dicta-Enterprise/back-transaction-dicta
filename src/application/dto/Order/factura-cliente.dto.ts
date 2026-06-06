import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FacturaClienteDto {
  @ApiPropertyOptional({ example: '900123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  identification?: string;

  @ApiPropertyOptional({ example: '9', description: 'Dígito verificación NIT' })
  @IsOptional()
  @IsString()
  @MaxLength(1)
  dv?: string;

  @ApiPropertyOptional({ example: 'Empresa S.A.S' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  company?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  names?: string;

  @ApiPropertyOptional({ example: 'Calle 1 # 2-3' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: 'juan@dominio.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '3001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;


  @ApiPropertyOptional({ example: '2', enum: ['1', '2'] })
  @IsOptional()
  @IsString()
  legal_organization_id?: string;


  @ApiPropertyOptional({ example: '21', enum: ['18', '21'] })
  @IsOptional()
  @IsString()
  tribute_id?: string;

  
   //1=CC  3=NIT  6=CE  11=Pasaporte
  
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  identification_document_id?: number;

  @ApiPropertyOptional({ example: 980, description: 'ID municipio DANE' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  municipality_id?: number;
}
