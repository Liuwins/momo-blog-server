import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { Notification } from './entities/notification.entity';
import { Follow } from './entities/follow.entity';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DB_PATH || './data/momoblog.db',
  entities: [User, Post, Comment, Like, Notification, Follow],
  // 迁移工具：仅在开发环境同步，生产用 migration:run
  synchronize: process.env.NODE_ENV !== 'production',
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  migrationsRun: false,
});
