import { Controller, Get, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req) {
    return this.usersService.getProfile(req.user.id, req.user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getProfile(@Param('id') id: number, @Request() req) {
    return this.usersService.getProfile(id, req.user?.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get(':id/posts')
  getUserPosts(@Param('id') id: number, @Query() query: any) {
    const page = parseInt(query.page as string) || 1;
    const pageSize = parseInt(query.pageSize as string) || 10;
    return this.usersService.getUserPosts(id, page, pageSize);
  }
}
