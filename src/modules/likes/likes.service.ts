import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from '../../entities/like.entity';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private likesRepo: Repository<Like>,
    private postsService: PostsService,
  ) {}

  async toggle(postId: number, userId?: number, visitorId?: string) {
    const post = await this.postsService.findById(postId);
    if (!post) return { liked: false, likeCount: 0 };

    // 查找是否已点赞（已登录用 userId，游客用 visitorId）
    const where: any = { postId };
    if (userId) {
      where.userId = userId;
    } else if (visitorId) {
      where.visitorId = visitorId;
    } else {
      // 没有任何标识，无法点赞
      return { liked: false, likeCount: post.likeCount };
    }

    const existing = await this.likesRepo.findOne({ where });

    if (existing) {
      await this.likesRepo.remove(existing);
      await this.likesRepo.manager.decrement('posts', { id: postId }, 'likeCount', 1);
      const updated = await this.postsService.findById(postId);
      return { liked: false, likeCount: updated?.likeCount || 0 };
    }

    const like = this.likesRepo.create({ postId, userId: userId || null, visitorId: visitorId || '' });
    await this.likesRepo.save(like);
    await this.likesRepo.manager.increment('posts', { id: postId }, 'likeCount', 1);
    const updated = await this.postsService.findById(postId);
    return { liked: true, likeCount: updated?.likeCount || 0 };
  }

  async getStatus(postId: number, userId?: number, visitorId?: string) {
    const post = await this.postsService.findById(postId);
    if (!post) return { liked: false, likeCount: 0 };

    const where: any = { postId };
    if (userId) {
      where.userId = userId;
    } else if (visitorId) {
      where.visitorId = visitorId;
    } else {
      return { liked: false, likeCount: post.likeCount };
    }

    const existing = await this.likesRepo.findOne({ where });
    return { liked: !!existing, likeCount: post.likeCount };
  }
}
