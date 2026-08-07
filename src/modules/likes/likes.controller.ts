import { Controller, Post, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { LikesService } from './likes.service';

@Controller('posts')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggle(@Param('id') postId: number, @Request() req) {
    return this.likesService.toggle(req.user.id, postId);
  }
}
