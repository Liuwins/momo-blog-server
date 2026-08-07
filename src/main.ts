import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: process.env.CLIENT_ORIGIN || '*',
    credentials: true,
  });

  const port = parseInt(process.env.PORT || '3001');
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
