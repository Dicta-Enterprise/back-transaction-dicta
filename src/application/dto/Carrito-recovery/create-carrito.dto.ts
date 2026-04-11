import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, ValidateNested } from 'class-validator';
import { CarritoCursoDto } from 'src/application/dto/Carrito-recovery/carritoCurso.dto';


export class CrearCarritoDto {
    @ApiProperty({ example: '42', description: 'ID del usuario (string desde el Front)' })
    @Type(() => Number)
    @IsInt()
    idUsuario!: number;

    @ApiProperty({type: [CarritoCursoDto],description: 'Lista de cursos a agregar al carrito'})
      @IsArray()
      @ArrayMinSize(1)
      @ValidateNested({ each: true })
      @Type(() => CarritoCursoDto)
      cursos!: CarritoCursoDto[];
}

