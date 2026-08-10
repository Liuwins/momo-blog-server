import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as path from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { LikesModule } from './modules/likes/likes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadModule } from './modules/upload/upload.module';
import { OgModule } from './modules/og/og.module';
import { HealthModule } from './modules/health/health.module';
import { FollowsModule } from './modules/follows/follows.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // 全局限流：每分钟最多 60 次请求/IP，防止暴力请求
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH || './data/momoblog.db',
      autoLoadEntities: true,
      // 仅开发环境开启 synchronize，生产环境必须用迁移
      synchronize: process.env.NODE_ENV !== 'production',
      // 生产环境启动时自动执行迁移
      migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
      migrationsRun: process.env.NODE_ENV === 'production',
    }),
    AuthModule,
    UsersModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    NotificationsModule,
    UploadModule,
    OgModule,
    HealthModule,
    FollowsModule,
  ],
  providers: [
    // 全局启用限流守卫
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
