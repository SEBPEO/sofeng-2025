import { Module } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { AiService } from './ai.service';
import { EmailService } from '../notifications/email.service';
import { NotificationPreferencesModule } from '../notification-preferences/notification-preferences.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationPreferencesModule, NotificationsModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, AiService, EmailService],
})
export class ConsultationsModule {}
