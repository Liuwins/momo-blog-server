import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Follow } from '../../entities/follow.entity';
import { Post } from '../../entities/post.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private followsRepo: Repository<Follow>,
    private dataSource: DataSource,
  ) {}

  // 关注：幂等（已关注不报错），禁止自关注
  async follow(followerId: number, followingId: number) {
    if (followerId === followingId) {
      throw new BadRequestException('不能关注自己');
    }
    const existing = await this.followsRepo.findOne({
      where: { followerId, followingId },
    });
    if (existing) return { followed: true };
    const follow = this.followsRepo.create({ followerId, followingId });
    await this.followsRepo.save(follow);
    return { followed: true };
  }

  // 取消关注：幂等
  async unfollow(followerId: number, followingId: number) {
    await this.followsRepo.delete({ followerId, followingId });
    return { followed: false };
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    if (!followerId) return false;
    return this.followsRepo.exist({ where: { followerId, followingId } });
  }

  async getFollowerCount(userId: number): Promise<number> {
    return this.followsRepo.count({ where: { followingId: userId } });
  }

  async getFollowingCount(userId: number): Promise<number> {
    return this.followsRepo.count({ where: { followerId: userId } });
  }

  // 关注的人的动态流（按时间倒序）
  async getFollowingPosts(userId: number, page: number, pageSize: number) {
    const qb = this.dataSource
      .getRepository(Post)
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .innerJoin(
        Follow,
        'f',
        'f.followingId = post.userId AND f.followerId = :userId',
        { userId },
      )
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { list: data, total };
  }
}
