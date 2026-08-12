import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto';
import { getAdminUsername } from './admin.guard';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // 单用户系统：仅允许管理员账号登录，其他账号一律拒绝
    if (dto.username !== getAdminUsername()) {
      throw new UnauthorizedException('本系统为单用户模式，仅管理员可登录');
    }
    const user = await this.usersService.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const token = this.generateToken(user.id, user.username);
    return { token, user: this.sanitize(user) };
  }

  private generateToken(userId: number, username: string): string {
    return this.jwtService.sign({ sub: userId, username });
  }

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
