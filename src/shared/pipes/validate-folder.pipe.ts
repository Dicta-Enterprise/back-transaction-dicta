import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ALLOWED_FOLDERS, AllowedFolder } from '../types/folder.type';




export class ValidateFolderPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transform(value: any): AllowedFolder {
        if (!ALLOWED_FOLDERS.includes(value)) {
          throw new BadRequestException(
            `Folder no válido. Los valores permitidos son: ${ALLOWED_FOLDERS.join(', ')}`
          );
        }
        return value;
      }
}