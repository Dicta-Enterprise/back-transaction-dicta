import { ApiProperty } from '@nestjs/swagger';
import {
   IsNumber,IsPositive, IsString, 
} from 'class-validator';

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
