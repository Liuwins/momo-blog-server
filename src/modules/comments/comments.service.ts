import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, CommentStatus } from '../../entities/comment.entity';
import { PostsService } from '../posts/posts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { CreateCommentDto } from './dto';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(Comment)
    private commentsRepo: Repository<Comment>,
    private postsService: PostsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(postId: number, dto: CreateCommentDto, userId?: number) {
    // 确认文章存在
    const post = await this.postsService.findById(postId);
    if (!post) {
      throw new HttpException('文章不存在', HttpStatus.NOT_FOUND);
    }

    // 登录用户使用其昵称，未登录使用 dto.nickname
    const nickname = userId
      ? (post.user?.nickname || dto.nickname || '匿名')
      : (dto.nickname || '匿名');

    const comment = this.commentsRepo.create({
      postId,
      userId: userId || null,
      nickname,
      visitorId: dto.visitorId || '',
      content: dto.content,
      status: CommentStatus.PENDING,
      replyToId: dto.replyToId,
      replyToNickname: dto.replyToNickname,
    });

    const saved = await this.commentsRepo.save(comment);
    await this.postsService.incrementCommentCount(postId);

    // 通知博主（自己评论自己不通知）
    if (post.userId && userId !== post.userId) {
      const type = dto.replyToId ? NotificationType.REPLY : NotificationType.COMMENT;
      this.notificationsService
        .createAndNotify({
          receiverId: post.userId,
          senderId: userId || null,
          type,
          postId,
          content: dto.content,
        })
        .catch((err) => {
          this.logger.error(`评论通知发送失败: ${err?.message || err}`);
        });
    }

    return {
      id: saved.id,
      userId: saved.userId,
      nickname: saved.nickname,
      content: saved.content,
      createdAt: saved.createdAt,
      status: saved.status,
      replyTo: saved.replyToId ? { id: saved.replyToId, nickname: saved.replyToNickname } : null,
    };
  }

  async findByPostId(postId: number, userId?: number) {
    const comments = await this.commentsRepo.find({
      where: { postId },
      order: { createdAt: 'ASC' },
    });

    return comments
      .filter((c) => {
        // 未登录用户：不展示已拒绝的评论
        if (!userId && c.status === CommentStatus.REJECTED) return false;
        return true;
      })
      .map((c) => {
        // 未登录：已审核正常显示；待审核返回占位文本（不泄露真实内容）+masked标记
        if (!userId && c.status === CommentStatus.PENDING) {
          return {
            id: c.id,
            userId: c.userId,
            nickname: c.nickname,
            content: '[该评论正在审核中]',
            createdAt: c.createdAt,
            status: c.status,
            masked: true,
            replyTo: c.replyToId ? { id: c.replyToId, nickname: c.replyToNickname } : null,
          };
        }
        // 登录用户/博主看到所有评论原文
        return {
          id: c.id,
          userId: c.userId,
          nickname: c.nickname,
          content: c.content,
          createdAt: c.createdAt,
          status: c.status,
          replyTo: c.replyToId ? { id: c.replyToId, nickname: c.replyToNickname } : null,
        };
      });
  }

  async delete(id: number, userId: number) {
    const comment = await this.commentsRepo.findOne({ where: { id } });
    if (!comment) return false;
    // 评论作者可删除；博主可删除自己文章下的任意评论
    const isOwner = comment.userId === userId;
    let isPostOwner = false;
    if (!isOwner) {
      const post = await this.postsService.findById(comment.postId);
      isPostOwner = !!post && post.userId === userId;
    }
    if (!isOwner && !isPostOwner) return false;
    await this.commentsRepo.remove(comment);
    await this.postsService.decrementCommentCount(comment.postId);
    return true;
  }

  /**
   * 校验当前用户是否为该评论所属文章的博主
   */
  private async assertPostOwner(commentId: number, userId: number): Promise<boolean> {
    const comment = await this.commentsRepo.findOne({ where: { id: commentId } });
    if (!comment) return false;
    const post = await this.postsService.findById(comment.postId);
    return !!post && post.userId === userId;
  }

  async approve(id: number, userId: number) {
    const isOwner = await this.assertPostOwner(id, userId);
    if (!isOwner) {
      throw new HttpException('无权审核他人文章的评论', HttpStatus.FORBIDDEN);
    }
    await this.commentsRepo.update(id, { status: CommentStatus.APPROVED });
    return true;
  }

  async reject(id: number, userId: number) {
    const isOwner = await this.assertPostOwner(id, userId);
    if (!isOwner) {
      throw new HttpException('无权审核他人文章的评论', HttpStatus.FORBIDDEN);
    }
    await this.commentsRepo.update(id, { status: CommentStatus.REJECTED });
    return true;
  }

  async getPendingCount(userId: number) {
    // 只统计当前用户文章下的待审核评论数
    const result = await this.commentsRepo
      .createQueryBuilder('c')
      .leftJoin('posts', 'p', 'p.id = c.postId')
      .where('c.status = :status', { status: CommentStatus.PENDING })
      .andWhere('p.userId = :userId', { userId })
      .getCount();
    return result;
  }

  async getPending(userId: number, page = 1, pageSize = 20) {
    // 只返回当前用户文章下的待审核评论
    const qb = this.commentsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.post', 'post')
      .leftJoinAndSelect('post.user', 'postUser')
      .where('c.status = :status', { status: CommentStatus.PENDING })
      .andWhere('post.userId = :userId', { userId })
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { list: data, total };
  }
}
