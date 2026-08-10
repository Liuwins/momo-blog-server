import { Controller, Post, Get, Param, Query, Request } from '@nestjs/common';
import { LikesService } from './likes.service';

@Controller('posts')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post(':id/like')
  toggle(@Param('id') postId: number, @Request() req, @Query('visitorId') visitorId?: string) {
    return this.likesService.toggle(postId, req.user?.id, visitorId);
  }

  @Get(':id/like-status')
  getStatus(@Param('id') postId: number, @Request() req, @Query('visitorId') visitorId?: string) {
    return this.likesService.getStatus(postId, req.user?.id, visitorId);
  }
}
