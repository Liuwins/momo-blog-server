import { Controller, Post, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { LikesService } from './likes.service';

@Controller('posts')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post(':id/like')
  @UseGuards(OptionalJwtAuthGuard)
  toggle(@Param('id') postId: number, @Request() req, @Query('visitorId') visitorId?: string) {
    return this.likesService.toggle(postId, req.user?.id, visitorId);
  }

  @Get(':id/like-status')
  @UseGuards(OptionalJwtAuthGuard)
  getStatus(@Param('id') postId: number, @Request() req, @Query('visitorId') visitorId?: string) {
    return this.likesService.getStatus(postId, req.user?.id, visitorId);
  }
}
