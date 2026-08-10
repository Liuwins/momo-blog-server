import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  async create(data: { username: string; password: string; nickname: string }) {
    // 密码必须哈希后存储，防止明文落库
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.usersRepo.create({
      ...data,
      password: hashedPassword,
    });
    return this.usersRepo.save(user);
  }

  async findById(id: number) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByUsername(username: string) {
    return this.usersRepo.findOne({ where: { username } });
  }

  async updateProfile(id: number, data: Partial<User>) {
    // 防止通过 updateProfile 修改密码字段
    const { password, ...safeData } = data;
    await this.usersRepo.update(id, safeData);
    return this.getProfile(id);
  }

  async getProfile(id: number) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    const result = await this.usersRepo.manager.query(
      'SELECT COUNT(*) as count FROM posts WHERE userId = ?',
      [id],
    );
    const postCount = parseInt(result[0].count);
    // 过滤掉敏感字段（password 哈希不应泄露）
    const { password, ...safeUser } = user;
    return {
      ...safeUser,
      postCount,
      followerCount: 0,
      followingCount: 0,
    };
  }

  async getUserPosts(userId: number, page: number, pageSize: number) {
    const rows: any[] = await this.usersRepo.manager.query(
      `SELECT p.id, p.content, p.images, p.tags, p.likeCount, p.commentCount, p.liked, p.createdAt, p.updatedAt,
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
      tags: r.tags ? (typeof r.tags === 'string' ? r.tags.split(',') : r.tags) : [],
    }));
    return {
      list,
      total: countResult[0]?.count ? parseInt(countResult[0].count) : 0,
    };
  }
}
