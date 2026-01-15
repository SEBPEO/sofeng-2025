import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedId?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        related_id: relatedId,
      },
    });
  }

  async getNotifications(userId: string, unreadOnly: boolean = false) {
    const where: any = { user_id: userId };
    if (unreadOnly) {
      where.is_read = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      take: 50, // Limit to last 50 notifications
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  async markAsRead(notificationId: number, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        notification_id: notificationId,
        user_id: userId,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });
  }

  async deleteNotification(notificationId: number, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        notification_id: notificationId,
        user_id: userId,
      },
    });
  }
}
