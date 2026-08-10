import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Like } from '../../entities/like.entity';
import { PostsService } from '../posts/posts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(
    @InjectRepository(Like)
    private likesRepo: Repository<Like>,
    private postsService: PostsService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
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

    // 使用事务保证点赞记录与计数的一致性
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (existing) {
        await queryRunner.manager.remove(existing);
        await this.postsService.decrementLikeCount(postId);
        await queryRunner.commitTransaction();
        const updated = await this.postsService.findById(postId);
        return { liked: false, likeCount: updated?.likeCount || 0 };
      }

      const like = this.likesRepo.create({ postId, userId: userId || null, visitorId: visitorId || '' });
      await queryRunner.manager.save(like);
      await this.postsService.incrementLikeCount(postId);
      await queryRunner.commitTransaction();
      const updated = await this.postsService.findById(postId);

      // 通知博主（自己点赞自己不通知）
      if (post.userId && userId !== post.userId) {
        this.notificationsService
          .createAndNotify({
            receiverId: post.userId,
            senderId: userId || null,
            type: NotificationType.LIKE,
            postId,
          })
          .catch((err) => {
            this.logger.error(`点赞通知发送失败: ${err?.message || err}`);
          });
      }

      return { liked: true, likeCount: updated?.likeCount || 0 };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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
