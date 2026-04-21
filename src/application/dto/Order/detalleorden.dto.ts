import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty, IsNumber, IsPositive,
  IsString, MaxLength,
} from 'class-validator';
 
export class DetalleOrdenDto {

  @ApiProperty({ example: 'abcr345abc1234567890abcd', description: 'ObjectId del curso ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  idcurso!: string;    
                
  @ApiProperty({ example: 'Marketing Digital' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombrecurso!: string;         

  @ApiProperty({ example: 150.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  precio!: number;                     
}
 