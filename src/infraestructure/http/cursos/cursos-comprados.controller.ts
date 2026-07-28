import { Controller, Get, HttpException, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetPurchasedCoursesUseCase } from 'src/application/uses-cases/Order/get-purchased-courses.use-case';

@ApiTags('Cursos')
@Controller('cursos')
export class CursosCompradosController {
  constructor(
    private readonly getPurchasedCoursesUseCase: GetPurchasedCoursesUseCase,
  ) {}

  @Get(':idusuario/comprados')
  @ApiOperation({
    summary: 'Obtener cursos comprados por usuario',
    description: 'Devuelve los cursos adquiridos por un usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cursos adquiridos obtenidos con éxito.',
  })
  async getPurchasedCourses(
    @Param('idusuario') idusuario: number,
  ) {
    const result = await this.getPurchasedCoursesUseCase.execute(
      Number(idusuario),
    );

    if (result.isFailure) {
      throw new HttpException(
        result.error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      data: result.getValue(),
      message: 'Cursos adquiridos obtenidos con éxito.',
    };
  }
}