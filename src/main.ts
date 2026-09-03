import {ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './docs/swagger';
import { Env } from './enviroments/models/enviroment.model';
import { CustomResponse } from './utils/customresponse';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<Env, true>>(ConfigService);
  app.setGlobalPrefix('gestion-eventos');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => CustomResponse(errors),
    }),
  );

  setupSwagger(app);
  const port = configService.get('PORT', { infer: true });
  await app.listen(port);
}
void bootstrap();
