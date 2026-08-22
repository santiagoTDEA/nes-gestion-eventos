import { Injectable } from '@nestjs/common';

@Injectable()
export class GetHelloUseCase {
  execute(): string {
    return 'Hello World!';
  }
}
