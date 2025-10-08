import { Module } from '@nestjs/common';
import { ValidateFolderPipe } from './validate-folder.pipe';

@Module({
  providers: [ValidateFolderPipe],
  imports: [],
  exports: [ValidateFolderPipe],
})
export class SharedPipesModule {}
