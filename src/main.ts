import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        // 控制台：彩色简洁格式
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, context }) =>
              `${timestamp} [${context || 'App'}] ${level}: ${message}`),
          ),
        }),
        // 错误日志：按天轮转，保留 14 天
        new DailyRotateFile({
          dirname: 'logs',
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // 全部日志：按天轮转，保留 7 天
        new DailyRotateFile({
          dirname: 'logs',
          filename: 'combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '7d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
  });

  app.setGlobalPrefix('api');

  // 静态文件服务：让 /images/* 能通过 HTTP 访问上传的图片和视频
  // 静态中间件优先于路由，不受 globalPrefix 影响
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'images');
  app.useStaticAssets(uploadDir, { prefix: '/images/' });

  // 全局校验管道：多余字段直接拒绝，类型自动转换
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 安全响应头（X-Content-Type-Options, X-Frame-Options, HSTS, CSP 等）
  app.use(helmet());

  // CORS：必须为具体源，禁止 '*' 与 credentials 共存
  const clientOrigin = process.env.CLIENT_ORIGIN;
  app.enableCors({
    origin: clientOrigin || false,
    credentials: true,
  });

  const port = parseInt(process.env.PORT || '3001');
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}
bootstrap();
