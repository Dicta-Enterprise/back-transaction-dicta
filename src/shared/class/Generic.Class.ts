export  abstract class GenericBase<T> {
  abstract data: T | T[];

  status: number;
  message: string;

  constructor(status: number, message: string) {
    this.status = status;
    this.message = message;
  }
}

export class GenericArray<T> extends GenericBase<T> {
  data: T[];

  constructor(data: T[], status: number, message: string) {
    super(status, message);
    this.data = data;
  }
}

export class GenericSingle<T> extends GenericBase<T> {
  data: T;

  constructor(data: T, status: number, message: string) {
    super(status, message);
    this.data = data;
  }
}
