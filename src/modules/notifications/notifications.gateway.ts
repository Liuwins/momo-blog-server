import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5175', credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * 从连接握手信息中校验 JWT，提取 userId
   * 前端需在 io({ auth: { token } }) 中传入 JWT
   */
  private authenticateClient(client: Socket): number | null {
    try {
      const token = client.handshake.auth?.token as string;
      if (!token) return null;
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) return null;
      const payload = this.jwtService.verify(token, { secret });
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    const userId = this.authenticateClient(client);
    if (!userId) {
      this.logger.warn(`WebSocket 连接拒绝：未认证或 token 无效 (client=${client.id})`);
      client.disconnect();
      return;
    }
    client.join(`user_${userId}`);
  }

  handleDisconnect() {
    // 基于 room 的连接管理，无需维护 socket 映射
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(@ConnectedSocket() client: Socket) {
    // 使用认证后的 userId，忽略客户端传入的 data.userId
    const userId = this.authenticateClient(client);
    if (!userId) return;
    await this.notificationsService.markAsRead(userId);
    this.server.to(`user_${userId}`).emit('unreadUpdate', { count: 0 });
  }

  async sendNotification(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  async sendUnreadCount(userId: number, count: number) {
    this.server.to(`user_${userId}`).emit('unreadUpdate', { count });
  }
}
