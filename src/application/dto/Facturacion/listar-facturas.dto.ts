import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateBy,
} from 'class-validator';
import { EstadoPago, TipoComprobante } from 'generated/prisma';

function EsFechaDiaMesAnio() {
  return ValidateBy({
    name: 'esFechaDiaMesAnio',
    validator: {
      validate(valor: unknown): boolean {
        if (typeof valor !== 'string') {
          return false;
        }

        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
          return false;
        }

        const [dia, mes, anio] = valor.split('/');
        const fecha = new Date(
          `${anio}-${mes}-${dia}T00:00:00.000Z`,
        );

        return (
          !Number.isNaN(fecha.getTime()) &&
          fecha.getUTCDate() === Number(dia) &&
          fecha.getUTCMonth() + 1 === Number(mes) &&
          fecha.getUTCFullYear() === Number(anio)
        );
      },

      defaultMessage: (argumentos) =>
        `${argumentos.property} debe ser una fecha valida en formato DD/MM/AAAA`,
    },
  });
}

export class ListarFacturasDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    maximum: 1000000,
    description: 'Pagina solicitada',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  pagina: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Cantidad de facturas por pagina',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 20;

  @ApiPropertyOptional({
    enum: EstadoPago,
    description: 'Filtrar por estado del pago',
  })
  @IsOptional()
  @IsEnum(EstadoPago)
  estadoPago?: EstadoPago;

  @ApiPropertyOptional({
    enum: TipoComprobante,
    description: 'Filtrar por tipo de comprobante',
  })
  @IsOptional()
  @IsEnum(TipoComprobante)
  tipoComprobante?: TipoComprobante;

  @ApiPropertyOptional({
    description: 'Identificador del curso incluido en la factura',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'idCurso no puede contener solo espacios',
  })
  idCurso?: string;

  @ApiPropertyOptional({
    type: String,
    example: '01/09/2026',
    description:
      'Fecha de emision inicial incluida en formato DD/MM/AAAA',
  })
  @IsOptional()
  @EsFechaDiaMesAnio()
  fechaInicio?: string;

  @ApiPropertyOptional({
    type: String,
    example: '30/09/2026',
    description:
      'Fecha de emision final incluida en formato DD/MM/AAAA',
  })
  @IsOptional()
  @EsFechaDiaMesAnio()
  fechaFin?: string;
}