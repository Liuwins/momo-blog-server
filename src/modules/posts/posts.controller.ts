import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PostsService } from './posts.service';
import { CreatePostDto, UpdatePostDto, QueryPostsDto } from './dto';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  findAll(@Query() query: QueryPostsDto, @Request() req) {
    return this.postsService.findAll(query, req.user?.id);
  }

  @Get(':id')
  findOne(@Param('id') id: number, @Request() req) {
    return this.postsService.findById(id, req.user?.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: number, @Request() req, @Body() dto: UpdatePostDto) {
    return this.postsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: number, @Request() req) {
    return this.postsService.delete(id, req.user.id);
  }
}
