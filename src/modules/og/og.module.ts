import { Module } from '@nestjs/common';
import { OgController } from './og.controller';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PostsModule],
  controllers: [OgController],
})
export class OgModule {}
