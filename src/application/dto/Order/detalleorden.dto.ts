import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt, IsNotEmpty, IsPositive,
  IsString, MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class DetalleOrdenDto {

  @ApiProperty({ example: 'abcr345abc1234567890abcd', description: 'ObjectId del curso' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  idcurso!: string;

  @ApiProperty({ example: 'Marketing Digital' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombrecurso!: string;

  @ApiProperty({ example: 1500 })
  @Transform(({ value }) => Math.trunc(Number(value)))
  @IsInt()
  @IsPositive()
  precio!: number;
}