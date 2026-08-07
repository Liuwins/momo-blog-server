import { Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req, @Query('page') page: number, @Query('pageSize') pageSize: number) {
    return this.notificationsService.findAll(req.user.id, page || 1, pageSize || 20);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Post('read-all')
  markAsRead(@Request() req) {
    return this.notificationsService.markAsRead(req.user.id);
  }
}
