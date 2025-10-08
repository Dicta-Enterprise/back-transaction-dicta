import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RequiredFile = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const file = request.file;
    
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }
    
    return file;
  }
);