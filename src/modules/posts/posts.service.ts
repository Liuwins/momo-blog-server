import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { Comment } from '../../entities/comment.entity';
import { Like } from '../../entities/like.entity';
import { CreatePostDto, UpdatePostDto, QueryPostsDto } from './dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepo: Repository<Post>,
    @InjectRepository(Comment)
    private commentsRepo: Repository<Comment>,
    @InjectRepository(Like)
    private likesRepo: Repository<Like>,
  ) {}

  async findAll(query: QueryPostsDto, currentUserId?: number) {
    const { page = 1, pageSize = 10, keyword, sortBy = 'latest', tag } = query;
    const qb = this.postsRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (keyword) {
      qb.andWhere('post.content LIKE :keyword', { keyword: `%${keyword}%` });
    }

    if (tag) {
      qb.andWhere('post.tags LIKE :tag', { tag: `%${tag}%` });
    }

    if (sortBy === 'hot') {
      qb.orderBy('post.likeCount', 'DESC');
    } else {
      qb.orderBy('post.createdAt', 'DESC');
    }

    const [data, total] = await qb.getManyAndCount();

    const items = await Promise.all(
      data.map(async (post) => ({
        id: post.id,
        userId: post.userId,
        user: post.user
          ? { id: post.user.id, nickname: post.user.nickname, avatar: post.user.avatar }
          : null,
        content: post.content,
        images: post.images,
        tags: post.tags || [],
        createdAt: post.createdAt,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        liked: currentUserId
          ? await this.likesRepo.exist({ where: { userId: currentUserId, postId: post.id } })
          : false,
        comments: await this.getPreviewComments(post.id, currentUserId),
        likeUsers: await this.getLikeUsers(post.id),
      })),
    );

    return { list: items, total };
  }

  async findById(id: number, currentUserId?: number) {
    const post = await this.postsRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!post) return null;

    return {
      id: post.id,
      userId: post.userId,
      user: post.user
        ? { id: post.user.id, nickname: post.user.nickname, avatar: post.user.avatar }
        : null,
      content: post.content,
      images: post.images,
      tags: post.tags || [],
      createdAt: post.createdAt,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      liked: currentUserId
        ? await this.likesRepo.exist({ where: { userId: currentUserId, postId: post.id } })
        : false,
      comments: await this.getFullComments(post.id, currentUserId),
      likeUsers: await this.getLikeUsers(post.id),
    };
  }

  async create(userId: number, dto: CreatePostDto) {
    const post = this.postsRepo.create({
      userId,
      content: dto.content,
      images: dto.images || [],
      tags: dto.tags || [],
    });
    const saved = await this.postsRepo.save(post);
    return this.findById(saved.id, userId);
  }

  async update(id: number, userId: number, dto: UpdatePostDto) {
    const post = await this.postsRepo.findOne({ where: { id } });
    if (!post || post.userId !== userId) return null;
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.images !== undefined) post.images = dto.images;
    if (dto.tags !== undefined) post.tags = dto.tags;
    await this.postsRepo.save(post);
    return this.findById(id, userId);
  }

  async delete(id: number, userId: number) {
    const post = await this.postsRepo.findOne({ where: { id } });
    if (!post || post.userId !== userId) return false;
    await this.postsRepo.remove(post);
    return true;
  }

  async getAllTags() {
    const posts = await this.postsRepo.find({ select: ['tags'] });
    const tagCount = new Map<string, number>();
    for (const p of posts) {
      for (const t of (p.tags || [])) {
        const tag = t.trim();
        if (tag) tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
    return Array.from(tagCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  async incrementCommentCount(id: number) {
    await this.postsRepo.increment({ id }, 'commentCount', 1);
  }

  async decrementCommentCount(id: number) {
    await this.postsRepo.decrement({ id }, 'commentCount', 1);
  }

  private async getPreviewComments(postId: number, currentUserId?: number) {
    const comments = await this.commentsRepo.find({
      where: { postId },
      relations: ['user'],
      take: 3,
      order: { createdAt: 'ASC' },
    });
    return this.filterCommentsForUser(comments, currentUserId);
  }

  private async getFullComments(postId: number, currentUserId?: number) {
    const comments = await this.commentsRepo.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    return this.filterCommentsForUser(comments, currentUserId);
  }

  private filterCommentsForUser(comments: any[], currentUserId?: number) {
    return comments
      .filter((c) => {
        if (c.status === 'approved') return true;
        if (currentUserId) return true;
        return false;
      })
      .map((c) => ({
        id: c.id,
        nickname: c.nickname || c.user?.nickname || '匿名',
        avatar: c.user?.avatar || '',
        content: c.content,
        createdAt: c.createdAt,
        status: c.status,
        replyTo: c.replyToId ? { id: c.replyToId, nickname: c.replyToNickname } : null,
      }));
  }

  private async getLikeUsers(postId: number) {
    const likes = await this.likesRepo.find({
      where: { postId },
      relations: ['user'],
      take: 8,
    });
    return likes
      .filter((l) => l.user)
      .map((l) => ({ id: l.user.id, nickname: l.user.nickname }));
  }
}
