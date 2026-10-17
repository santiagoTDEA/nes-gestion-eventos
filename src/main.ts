import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupSwagger } from './docs/swagger';
import { Env } from './enviroments/models/enviroment.model';
import { CustomResponse } from './utils/customresponse';
import { HttpExceptionFilter } from './utils/filters/http-exception/http-exception.filter';
import {
  FILES_URL_PREFIX,
  PUBLIC_ROOT,
} from './diffusion/storage/file-storage';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get<ConfigService<Env, true>>(ConfigService);
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Carpeta pública con las piezas de difusión (por ahora en disco local).
  app.useStaticAssets(PUBLIC_ROOT, { prefix: FILES_URL_PREFIX });

  app.setGlobalPrefix('gestion-eventos');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => CustomResponse(errors),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  setupSwagger(app);

  const port =
    configService.get<number>('PORT', {
      infer: true,
    }) ?? 3000;

  await app.listen(port, '0.0.0.0');
}
void bootstrap();
