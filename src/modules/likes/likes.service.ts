import { Injectable } from '@nestjs/common';
import { NotificationType } from "../../entities/notification.entity";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Like } from '../../entities/like.entity';
import { PostsService } from '../posts/posts.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private likesRepo: Repository<Like>,
    private postsService: PostsService,
    private notificationsService: NotificationsService,
  ) {}

  async toggle(userId: number, postId: number) {
    const existing = await this.likesRepo.findOne({ where: { userId, postId } });

    if (existing) {
      await this.likesRepo.remove(existing);
      await this.postsService.findById(postId).then((p) => {
        if (p) this.likesRepo.manager.decrement('posts', { id: postId }, 'likeCount', 1);
      });
      return { liked: false };
    }

    const like = this.likesRepo.create({ userId, postId });
    await this.likesRepo.save(like);
    await this.likesRepo.manager.increment('posts', { id: postId }, 'likeCount', 1);

    const post = await this.postsService.findById(postId);
    if (post && post.userId !== userId) {
      await this.notificationsService.create({
        receiverId: post.userId,
        senderId: userId,
        type: NotificationType.LIKE,
        postId,
        content: '',
      });
    }

    return { liked: true };
  }
}
