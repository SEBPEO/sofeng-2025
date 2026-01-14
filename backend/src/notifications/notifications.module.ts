import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Module({
  imports: [PrismaModule, NotificationPreferencesModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, NotificationSchedulerService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
