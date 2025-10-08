import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidationError } from 'src/shared/domain/errors/validation.error';

@Injectable()
export class ValidatorService {
  async validate<T extends object>(
    dto: T,
    DtoClass: new () => T,
  ): Promise<void> {
    const instance = plainToInstance(DtoClass, dto);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const message = this.formatErrors(errors);
      throw new ValidationError(message);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatErrors(errors: any[]): string {
    return errors
      .map((error) => {
        const constraints = Object.values(error.constraints || {});
        return constraints.join(', ');
      })
      .join(' | ');
  }
}
