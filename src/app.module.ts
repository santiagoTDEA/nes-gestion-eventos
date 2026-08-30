import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GetHelloUseCase } from './application/use-cases/get-hello.use-case';
import { AppController } from './infrastructure/http/controllers/app.controller';
import { RequestHeadersInterceptor } from './infrastructure/http/interceptors/request-headers.interceptor';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [
    GetHelloUseCase,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestHeadersInterceptor,
    },
  ],
})
export class AppModule {}
