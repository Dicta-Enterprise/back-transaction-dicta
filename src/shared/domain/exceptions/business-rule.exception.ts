export class BussinesRuleException extends Error {
  constructor(
    public readonly message: string,
    public readonly errorCode: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'BusinessRuleException';
  }
}
