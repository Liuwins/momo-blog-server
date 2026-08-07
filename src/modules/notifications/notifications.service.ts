import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
  ) {}

  async create(data: {
    receiverId: number;
    senderId: number;
    type: NotificationType;
    postId?: number;
    content?: string;
  }) {
    const notification = this.notificationsRepo.create(data);
    const saved = await this.notificationsRepo.save(notification);
    return saved;
  }

  async findAll(userId: number, page = 1, pageSize = 20) {
    const [data, total] = await this.notificationsRepo.findAndCount({
      where: { receiverId: userId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list: data, total };
  }

  async markAsRead(userId: number) {
    await this.notificationsRepo.update(
      { receiverId: userId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: number) {
    return this.notificationsRepo.count({
      where: { receiverId: userId, isRead: false },
    });
  }
}
