import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

// 单用户系统：管理员用户名，可通过环境变量 ADMIN_USERNAME 覆盖
export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME || 'admin';
}

// 管理员守卫：必须已登录（JwtAuthGuard 先执行）且为管理员账号
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.username !== getAdminUsername()) {
      throw new ForbiddenException('仅管理员可执行此操作');
    }
    return true;
  }
}
