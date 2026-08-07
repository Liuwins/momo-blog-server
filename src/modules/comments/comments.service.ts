import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { NotificationType } from "../../entities/notification.entity";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../entities/comment.entity';
import { PostsService } from '../posts/posts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepo: Repository<Comment>,
    private postsService: PostsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(postId: number, userId: number, dto: CreateCommentDto) {
    // 确认文章存在
    const post = await this.postsService.findById(postId);
    if (!post) {
      throw new HttpException('文章不存在', HttpStatus.NOT_FOUND);
    }
    const comment = this.commentsRepo.create({
      postId,
      userId,
      content: dto.content,
      replyToId: dto.replyToId,
      replyToNickname: dto.replyToNickname,
    });
    const saved = await this.commentsRepo.save(comment);
    await this.postsService.incrementCommentCount(postId);

    const full = await this.commentsRepo.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });

    if (post.userId !== userId) {
      await this.notificationsService.create({
        receiverId: post.userId,
        senderId: userId,
        type: dto.replyToId ? NotificationType.REPLY : NotificationType.COMMENT,
        postId,
        content: dto.content,
      });
    }

    return {
      id: full.id,
      userId: full.userId,
      user: { id: full.user.id, nickname: full.user.nickname, avatar: full.user.avatar },
      content: full.content,
      createdAt: full.createdAt,
      replyTo: dto.replyToId ? { id: dto.replyToId, nickname: dto.replyToNickname } : null,
    };
  }

  async delete(id: number, userId: number) {
    const comment = await this.commentsRepo.findOne({ where: { id } });
    if (!comment || comment.userId !== userId) return false;
    await this.commentsRepo.remove(comment);
    await this.postsService.decrementCommentCount(comment.postId);
    return true;
  }
}
