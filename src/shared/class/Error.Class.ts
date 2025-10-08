import { GenericBase } from './Generic.Class';

export class CustomError<T> extends GenericBase<T> {
    data: T | null; // Puedes hacer esto para manejar el caso de no tener datos
  
    constructor(data: T | null, message: string, status: number = 400) {
      super(status, message);
      this.data = data;
    }
  }