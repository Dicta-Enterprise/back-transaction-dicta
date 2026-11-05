import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsInt, IsPositive } from 'class-validator';

export class ResumenComprasDto {
  @ApiProperty({ example: [1, 2, 3], description: 'Ids de usuario de back-auth (máximo 1000).' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  ids: number[];
}
