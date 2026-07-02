import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class CarritoCursoDto {
  @ApiProperty({
    example: 'abc123xyz456abc123xyz456',
    description: 'ID del curso (ObjectId de 24 caracteres)'
  })
  @IsString()
  @Length(24, 24)
  idcurso!: string;

  @ApiProperty({ example: 'Marketing Digital' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombrecurso!: string;
}