import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
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

  @Get('tags')
  getTags() {
    return this.postsService.getAllTags();
  }

  @Get(':id')
  async findOne(@Param('id') id: number, @Request() req) {
    const post = await this.postsService.findById(id, req.user?.id);
    if (!post) throw new NotFoundException('文章不存在');
    return post;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() dto: CreatePostDto) {
    return this.postsService.create(req.user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: number, @Request() req, @Body() dto: UpdatePostDto) {
    const result = await this.postsService.update(id, req.user.id, dto);
    if (!result) throw new NotFoundException('文章不存在或无权操作');
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: number, @Request() req) {
    const result = await this.postsService.delete(id, req.user.id);
    if (!result) throw new NotFoundException('文章不存在或无权操作');
    return { success: true };
  }
}
