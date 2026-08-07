import { Controller, Post, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto';

@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(dto.postId, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: number, @Request() req) {
    return this.commentsService.delete(id, req.user.id);
  }
}
