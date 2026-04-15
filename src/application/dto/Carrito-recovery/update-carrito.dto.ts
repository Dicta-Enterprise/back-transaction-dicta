import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CarritoCursoDto } from 'src/application/dto/Carrito-recovery/carritoCurso.dto';

export class ActualizarCarritoDto {
  @ApiProperty({ example: 1, description: 'ID del carrito' })
  @Type(() => Number)
  @IsInt()
  carritoId!: number;

  @ApiProperty({
    type: [CarritoCursoDto],
    required: false,
    description: 'Cursos a agregar'
  })
  @IsOptional()
  @IsArray()
  @Type(() => CarritoCursoDto)
  cursosAgregar?: CarritoCursoDto[];

  @ApiProperty({
    type: [String],
    required: false,
    description: 'IDs de cursos a eliminar'
  })
  @IsOptional()
  @IsArray()
  cursosEliminar?: string[];
}