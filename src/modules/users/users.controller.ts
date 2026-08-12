import { Controller, Get, Put, Body, Param, UseGuards, Request, Query, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { getAdminUsername } from '../auth/admin.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  // 公开接口：获取博主（管理员）资料，供访客浏览封面/头像
  @Get('owner')
  async getOwnerProfile() {
    const user = await this.usersService.findByUsername(getAdminUsername());
    if (!user) return null;
    // 过滤掉密码等敏感字段
    const { password, ...safe } = user;
    return safe;
  }

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
    // 封面图与背景音乐仅管理员可设置，访客/普通账号无编辑权限
    if (
      (dto.bgImage !== undefined || dto.bgMusic !== undefined) &&
      req.user.username !== getAdminUsername()
    ) {
      throw new ForbiddenException('封面与背景音乐仅管理员可设置');
    }
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Get(':id/posts')
  getUserPosts(@Param('id') id: number, @Query() query: any) {
    const page = parseInt(query.page as string) || 1;
    const pageSize = parseInt(query.pageSize as string) || 10;
    return this.usersService.getUserPosts(id, page, pageSize);
  }
}
