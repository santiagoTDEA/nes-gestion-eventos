import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetHelloUseCase } from '../../../application/use-cases/get-hello.use-case';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly getHelloUseCase: GetHelloUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Verificar que la API está disponible' })
  @ApiResponse({ status: 200, description: 'La API está funcionando' })
  getHello(): string {
    return this.getHelloUseCase.execute();
  }
}
