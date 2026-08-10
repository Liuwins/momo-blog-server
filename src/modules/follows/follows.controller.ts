import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FollowsService } from './follows.service';

@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private followsService: FollowsService) {}

  // 关注某人
  @Post(':userId')
  follow(@Request() req, @Param('userId') userId: number) {
    return this.followsService.follow(req.user.id, Number(userId));
  }

  // 取消关注
  @Delete(':userId')
  unfollow(@Request() req, @Param('userId') userId: number) {
    return this.followsService.unfollow(req.user.id, Number(userId));
  }

  // 关注的人的动态流
  @Get('posts')
  followingPosts(@Request() req, @Query('page') page = '1', @Query('pageSize') pageSize = '10') {
    return this.followsService.getFollowingPosts(
      req.user.id,
      Number(page),
      Number(pageSize),
    );
  }
}
