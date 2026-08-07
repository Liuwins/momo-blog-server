import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private notificationsService: NotificationsService) {}

  private userSockets = new Map<number, string>();

  handleConnection(client: Socket) {
    const userId = Number(client.handshake.auth.userId);
    if (userId) {
      this.userSockets.set(userId, client.id);
      client.join(`user_${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.handshake.auth.userId);
    if (userId) {
      this.userSockets.delete(userId);
    }
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: number }) {
    await this.notificationsService.markAsRead(data.userId);
    client.to(`user_${data.userId}`).emit('unreadUpdate', { count: 0 });
  }

  async sendNotification(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  async sendUnreadCount(userId: number, count: number) {
    this.server.to(`user_${userId}`).emit('unreadUpdate', { count });
  }
}
