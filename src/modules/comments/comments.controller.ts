import { Controller, Get, Post, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto';

@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Request() req, @Body() dto: CreateCommentDto) {
    // 未登录也可以评论（userId 可选）
    return this.commentsService.create(dto.postId, dto, req.user?.id);
  }

  @Get('post/:postId')
  @UseGuards(OptionalJwtAuthGuard)
  findByPost(@Param('postId') postId: number, @Request() req) {
    // 未登录也能看（只返回已审核的），登录了看所有
    const userId = req.user?.id;
    return this.commentsService.findByPostId(postId, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: number, @Request() req) {
    return this.commentsService.delete(id, req.user.id);
  }

  // 博主审核评论
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  approve(@Param('id') id: number) {
    return this.commentsService.approve(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  reject(@Param('id') id: number) {
    return this.commentsService.reject(id);
  }

  // 待审核列表
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard)
  getPending(@Query('page') page: number, @Query('pageSize') pageSize: number) {
    return this.commentsService.getPending(page || 1, pageSize || 20);
  }

  @Get('admin/pending-count')
  @UseGuards(JwtAuthGuard)
  getPendingCount() {
    return this.commentsService.getPendingCount();
  }
}
