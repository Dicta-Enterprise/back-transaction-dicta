import { Module } from '@nestjs/common';
import { ValidatorService } from './application/validation/validator.service';

@Module({
  providers: [ValidatorService],
  exports: [ValidatorService],
})
export class SharedModule {}
