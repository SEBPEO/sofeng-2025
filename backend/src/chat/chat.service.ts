import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationDto } from './dto/conversation.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../notifications/email.service';
import { NotificationPreferencesService } from '../notification-preferences/notification-preferences.service';
import { AuditService } from '../audit/audit.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChatService {
  private readonly uploadDir = 'uploads/chat-attachments';

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private notificationPreferencesService: NotificationPreferencesService,
    private auditService: AuditService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async getConversations(userId: string): Promise<ConversationDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        doctor_profile: {
          include: {
            patients: {
              include: {
                patient: {
                  include: { user: true },
                },
              },
            },
          },
        },
        patient_profile: {
          include: {
            doctors: {
              include: {
                doctor: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const allowedUsers: Array<{
      user_id: string;
      first_name: string;
      last_name: string;
      role: string;
    }> = [];

    if (user.doctor_profile) {
      user.doctor_profile.patients.forEach((rel) => {
        allowedUsers.push({
          user_id: rel.patient.user.user_id,
          first_name: rel.patient.user.first_name,
          last_name: rel.patient.user.last_name,
          role: rel.patient.user.role,
        });
      });
    }

    if (user.patient_profile) {
      user.patient_profile.doctors.forEach((rel) => {
        allowedUsers.push({
          user_id: rel.doctor.user.user_id,
          first_name: rel.doctor.user.first_name,
          last_name: rel.doctor.user.last_name,
          role: rel.doctor.user.role,
        });
      });
    }

    const conversations: ConversationDto[] = [];

    for (const otherUser of allowedUsers) {
      const lastMessage = await this.prisma.chat.findFirst({
        where: {
          OR: [
            { sender_id: userId, receiver_id: otherUser.user_id },
            { sender_id: otherUser.user_id, receiver_id: userId },
          ],
        },
        orderBy: { sent_at: 'desc' },
        include: {
          sender: true,
          receiver: true,
        },
      });

      const unreadCount = await this.prisma.chat.count({
        where: {
          sender_id: otherUser.user_id,
          receiver_id: userId,
          read_at: null,
        },
      });

      conversations.push({
        user_id: otherUser.user_id,
        first_name: otherUser.first_name,
        last_name: otherUser.last_name,
        role: otherUser.role,
        last_message: lastMessage
          ? {
              content: lastMessage.content,
              sent_at: lastMessage.sent_at,
              is_read: lastMessage.read_at !== null,
              is_sent_by_me: lastMessage.sender_id === userId,
            }
          : null,
        unread_count: unreadCount,
      });
    }

    conversations.sort((a, b) => {
      if (!a.last_message && !b.last_message) return 0;
      if (!a.last_message) return 1;
      if (!b.last_message) return -1;
      return (
        new Date(b.last_message.sent_at).getTime() - new Date(a.last_message.sent_at).getTime()
      );
    });

    return conversations;
  }

  async getMessages(currentUserId: string, otherUserId: string): Promise<MessageResponseDto[]> {
    await this.verifyCanChat(currentUserId, otherUserId);

    const messages = await this.prisma.chat.findMany({
      where: {
        OR: [
          { sender_id: currentUserId, receiver_id: otherUserId },
          { sender_id: otherUserId, receiver_id: currentUserId },
        ],
      },
      orderBy: { sent_at: 'asc' },
      include: {
        sender: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
        receiver: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
      },
    });

    return messages;
  }

  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<MessageResponseDto> {
    await this.verifyCanChat(senderId, receiverId);

    const message = await this.prisma.chat.create({
      data: {
        sender_id: senderId,
        receiver_id: receiverId,
        content,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
        receiver: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            role: true,
            email: true,
          },
        },
      },
    });

    // Send notifications
    await this.sendMessageNotifications(message);

    // Log message sent
    try {
      await this.auditService.logDataOperation(
        senderId,
        'MESSAGE_SENT',
        'Chat',
        message.message_id.toString(),
        { receiverId },
      );
    } catch (error) {
      console.error('Failed to log message sent:', error);
    }

    return message;
  }

  async sendMessageWithAttachment(
    senderId: string,
    receiverId: string,
    content: string,
    file: any,
  ): Promise<MessageResponseDto> {
    await this.verifyCanChat(senderId, receiverId);

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const message = await this.prisma.chat.create({
      data: {
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        file_path: filePath,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
        receiver: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            role: true,
            email: true,
          },
        },
      },
    });

    // Send notifications
    await this.sendMessageNotifications(message);

    // Log message sent with file
    try {
      await this.auditService.logDataOperation(
        senderId,
        'MESSAGE_SENT',
        'Chat',
        message.message_id.toString(),
        { receiverId, fileName: file.originalname, fileType: file.mimetype },
      );
    } catch (error) {
      console.error('Failed to log message sent:', error);
    }

    return message;
  }

  async markAsRead(currentUserId: string, otherUserId: string): Promise<void> {
    await this.prisma.chat.updateMany({
      where: {
        sender_id: otherUserId,
        receiver_id: currentUserId,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });
  }

  async getAttachment(
    messageId: number,
    userId: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const message = await this.prisma.chat.findUnique({
      where: { message_id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId && message.receiver_id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!message.file_path) {
      throw new NotFoundException('No attachment found');
    }

    return {
      filePath: message.file_path,
      fileName: message.file_name || 'attachment',
    };
  }

  private async verifyCanChat(userId1: string, userId2: string): Promise<void> {
    const relationship = await this.prisma.doctorPatient.findFirst({
      where: {
        OR: [
          {
            doctor: { user_id: userId1 },
            patient: { user_id: userId2 },
          },
          {
            doctor: { user_id: userId2 },
            patient: { user_id: userId1 },
          },
        ],
      },
    });

    if (!relationship) {
      throw new ForbiddenException('You can only message your assigned doctors or patients');
    }
  }

  private async sendMessageNotifications(message: any) {
    const senderName = `${message.sender.first_name} ${message.sender.last_name}`;
    const receiverId = message.receiver_id;
    const receiverEmail = message.receiver.email;

    // notif preference
    const preferences = await this.notificationPreferencesService.getPreferences(receiverId);

    // in-app notification
    if (preferences.in_app_enabled && preferences.in_app_messages) {
      await this.notificationsService.createNotification(
        receiverId,
        'MESSAGE',
        `New message from ${senderName}`,
        message.content.substring(0, 100),
        message.message_id.toString(),
      );
    }

    
    const unreadCount = await this.prisma.chat.count({
      where: {
        sender_id: message.sender_id,
        receiver_id: receiverId,
        read_at: null,
      },
    });

    // email notif
    if (preferences.email_enabled && preferences.email_unread_messages) {
      await this.emailService.sendUnreadMessageNotification(
        receiverId,
        receiverEmail,
        senderName,
        unreadCount,
      );
    }

    
  }
}
