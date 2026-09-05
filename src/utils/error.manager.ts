import { HttpException, HttpStatus } from '@nestjs/common';

export class ErrorManager extends Error {
  constructor({
    type,
    message,
  }: {
    type: keyof typeof HttpStatus;
    message: string;
  }) {
    super(`${type}::${message}`);
    this.name = this.constructor.name;
  }

  public static createAsignatureError(message: string) {
    const [type] = message.split('::');
    if (type) {
      throw new HttpException(
        message,
        HttpStatus[type as keyof typeof HttpStatus],
      );
    } else {
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
