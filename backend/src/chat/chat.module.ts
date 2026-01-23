import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';

@Module({
  imports: [PrismaModule, NotificationsModule, NotificationPreferencesModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
