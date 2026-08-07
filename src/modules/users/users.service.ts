import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async create(data: { username: string; password: string; nickname: string }) {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async findById(id: number) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByUsername(username: string) {
    return this.usersRepo.findOne({ where: { username } });
  }

  async updateProfile(id: number, data: Partial<User>) {
    await this.usersRepo.update(id, data);
    return this.findById(id);
  }

  async getProfile(id: number) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    const result = await this.usersRepo.manager.query(
      'SELECT COUNT(*) as count FROM posts WHERE userId = ?',
      [id],
    );
    const postCount = parseInt(result[0].count);
    return {
      ...user,
      postCount,
      followerCount: 0,
      followingCount: 0,
    };
  }

  async getUserPosts(userId: number, page: number, pageSize: number) {
    const rows: any[] = await this.usersRepo.manager.query(
      `SELECT p.id, p.content, p.images, p.likeCount, p.commentCount, p.liked, p.createdAt, p.updatedAt,
              u.id as userId, u.nickname, u.avatar
       FROM posts p
       LEFT JOIN users u ON p.userId = u.id
       WHERE p.userId = ?
       ORDER BY p.createdAt DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, (page - 1) * pageSize],
    );
    const countResult = await this.usersRepo.manager.query(
      'SELECT COUNT(*) as count FROM posts WHERE userId = ?',
      [userId],
    );
    // simple-array 存的是逗号分隔字符串，转回数组
    const list = rows.map((r: any) => ({
      ...r,
      images: r.images ? (typeof r.images === 'string' ? r.images.split(',') : r.images) : [],
    }));
    return {
      list,
      total: countResult[0]?.count ? parseInt(countResult[0].count) : 0,
    };
  }
}
