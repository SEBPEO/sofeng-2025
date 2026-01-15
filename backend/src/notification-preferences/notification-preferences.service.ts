import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string) {
    let preferences = await this.prisma.notificationPreferences.findUnique({
      where: { user_id: userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.prisma.notificationPreferences.create({
        data: {
          user_id: userId,
          email_enabled: true,
          email_unread_messages: true,
          email_appointments: true,
          push_enabled: true,
          push_messages: true,
          push_appointments: true,
          in_app_enabled: true,
          in_app_messages: true,
          in_app_appointments: true,
          reminder_time_1: 1440, // 1 day
          reminder_time_2: 60, // 1 hour
        },
      });
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    updateDto: UpdateNotificationPreferencesDto,
  ) {
    // Ensure the user exists
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if preferences exist
    const existingPreferences =
      await this.prisma.notificationPreferences.findUnique({
        where: { user_id: userId },
      });

    if (existingPreferences) {
      // Update existing preferences
      return this.prisma.notificationPreferences.update({
        where: { user_id: userId },
        data: updateDto,
      });
    } else {
      // Create new preferences with provided data
      return this.prisma.notificationPreferences.create({
        data: {
          user_id: userId,
          ...updateDto,
        },
      });
    }
  }
}
