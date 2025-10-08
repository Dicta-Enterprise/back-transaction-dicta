export class Result<T> {
    public readonly isSuccess: boolean;
    public readonly isFailure: boolean;
    public readonly error?: Error;
    private readonly _value?: T;
  
    private constructor(isSuccess: boolean, error?: Error, value?: T) {
      if (isSuccess && error) {
        throw new Error('Resultado exitoso no puede contener un error');
      }
      if (!isSuccess && !error) {
        throw new Error('Resultado fallido debe contener un error');
      }
  
      this.isSuccess = isSuccess;
      this.isFailure = !isSuccess;
      this.error = error;
      this._value = value;
    }
  
    public getValue(): T {
      if (this.isFailure) {
        throw new Error('No se puede obtener valor de un resultado fallido');
      }
      return this._value as T;
    }
  
    public static ok<U>(value?: U): Result<U> {
      return new Result<U>(true, undefined, value);
    }

    public static okList<U>(value?: U[]): Result<U[]> {
      return new Result<U[]>(true, undefined, value);
    }
  
    public static fail<U>(error: Error): Result<U> {
      return new Result<U>(false, error);
    }
  }