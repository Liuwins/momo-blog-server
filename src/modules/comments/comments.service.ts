import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, CommentStatus } from '../../entities/comment.entity';
import { PostsService } from '../posts/posts.service';
import { CreateCommentDto } from './dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepo: Repository<Comment>,
    private postsService: PostsService,
  ) {}

  async create(postId: number, dto: CreateCommentDto, userId?: number) {
    // 确认文章存在
    const post = await this.postsService.findById(postId);
    if (!post) {
      throw new HttpException('文章不存在', HttpStatus.NOT_FOUND);
    }

    const comment = this.commentsRepo.create({
      postId,
      userId: userId || null,
      nickname: dto.nickname || '匿名',
      visitorId: dto.visitorId || '',
      content: dto.content,
      status: CommentStatus.PENDING,
      replyToId: dto.replyToId,
      replyToNickname: dto.replyToNickname,
    });

    const saved = await this.commentsRepo.save(comment);
    await this.postsService.incrementCommentCount(postId);

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

    return comments.map((c) => {
      // 未登录只能看到已审核的
      if (!userId) {
        if (c.status !== CommentStatus.APPROVED) {
          return null;
        }
        return {
          id: c.id,
          nickname: c.nickname,
          content: c.content,
          createdAt: c.createdAt,
          status: c.status,
          replyTo: c.replyToId ? { id: c.replyToId, nickname: c.replyToNickname } : null,
        };
      }
      // 博主看到所有评论
      return {
        id: c.id,
        nickname: c.nickname,
        content: c.content,
        createdAt: c.createdAt,
        status: c.status,
        replyTo: c.replyToId ? { id: c.replyToId, nickname: c.replyToNickname } : null,
      };
    }).filter(Boolean);
  }

  async delete(id: number, userId: number) {
    const comment = await this.commentsRepo.findOne({ where: { id } });
    if (!comment || comment.userId !== userId) return false;
    await this.commentsRepo.remove(comment);
    await this.postsService.decrementCommentCount(comment.postId);
    return true;
  }

  async approve(id: number) {
    await this.commentsRepo.update(id, { status: CommentStatus.APPROVED });
    return true;
  }

  async reject(id: number) {
    await this.commentsRepo.update(id, { status: CommentStatus.REJECTED });
    return true;
  }

  async getPendingCount() {
    return this.commentsRepo.count({ where: { status: CommentStatus.PENDING } });
  }

  async getPending(page = 1, pageSize = 20) {
    const [data, total] = await this.commentsRepo.findAndCount({
      where: { status: CommentStatus.PENDING },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list: data, total };
  }
}
