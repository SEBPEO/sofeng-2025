import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { NotificationPreferencesService } from '../notification-preferences/notification-preferences.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private notificationPreferencesService: NotificationPreferencesService,
  ) {}

  // Run every 15 minutes to check for appointment reminders
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAppointmentReminders() {
    this.logger.log('Checking for appointment reminders...');

    try {
      // Get all users with their notification preferences
      const users = await this.prisma.user.findMany({
        include: {
          notificationPreferences: true,
          patient_profile: {
            include: {
              appointments: {
                where: {
                  status: 'scheduled',
                  appointment_datetime: {
                    gte: new Date(), // Only future appointments
                  },
                },
                include: {
                  doctor: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
          doctor_profile: {
            include: {
              appointments: {
                where: {
                  status: 'scheduled',
                  appointment_datetime: {
                    gte: new Date(), // Only future appointments
                  },
                },
                include: {
                  patient: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      for (const user of users) {
        const preferences = user.notificationPreferences || {
          reminder_time_1: 1440, // Default 1 day
          reminder_time_2: 60, // Default 1 hour
          in_app_enabled: true,
          in_app_appointments: true,
          email_enabled: true,
          email_appointments: true,
          push_enabled: true,
          push_appointments: true,
        };

        const appointments = [
          ...(user.patient_profile?.appointments || []),
          ...(user.doctor_profile?.appointments || []),
        ];

        for (const appointment of appointments) {
          await this.checkAndSendReminder(
            user,
            appointment,
            preferences.reminder_time_1,
            preferences,
          );
          await this.checkAndSendReminder(
            user,
            appointment,
            preferences.reminder_time_2,
            preferences,
          );
        }
      }

      this.logger.log('Appointment reminders check completed');
    } catch (error) {
      this.logger.error('Error checking appointment reminders:', error);
    }
  }

  private async checkAndSendReminder(
    user: any,
    appointment: any,
    reminderTimeMinutes: number,
    preferences: any,
  ) {
    const now = new Date();
    const appointmentTime = new Date(appointment.appointment_datetime);
    const reminderTime = new Date(
      appointmentTime.getTime() - reminderTimeMinutes * 60 * 1000,
    );

    // check if we should send the reminder now (within a 15-minute window)
    const timeDiff = reminderTime.getTime() - now.getTime();
    const withinWindow = timeDiff >= 0 && timeDiff <= 15 * 60 * 1000; // 15-minute window

    if (!withinWindow) {
      return;
    }

    // check if reminder was already sent for this time
    const reminderKey = `reminder_${appointment.appointment_id}_${reminderTimeMinutes}`;
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        user_id: user.user_id,
        type: 'APPOINTMENT_REMINDER',
        related_id: reminderKey,
        created_at: {
          gte: new Date(now.getTime() - 20 * 60 * 1000), // Within last 20 minutes
        },
      },
    });

    if (existingNotification) {
      return; // Already sent
    }

    //Determine the other person (doctor or patient)
    const isPatient = !!user.patient_profile;
    const otherPerson = isPatient
      ? appointment.doctor.user
      : appointment.patient.user;
    const otherPersonName = `${otherPerson.first_name} ${otherPerson.last_name}`;
    const role = isPatient ? 'Dr.' : '';

    const timeBeforeText =
      reminderTimeMinutes >= 1440
        ? `${Math.floor(reminderTimeMinutes / 1440)} day${Math.floor(reminderTimeMinutes / 1440) > 1 ? 's' : ''}`
        : reminderTimeMinutes >= 60
          ? `${Math.floor(reminderTimeMinutes / 60)} hour${Math.floor(reminderTimeMinutes / 60) > 1 ? 's' : ''}`
          : `${reminderTimeMinutes} minute${reminderTimeMinutes > 1 ? 's' : ''}`;

    //Send in-app notification
    if (preferences.in_app_enabled && preferences.in_app_appointments) {
      await this.notificationsService.createNotification(
        user.user_id,
        'APPOINTMENT_REMINDER',
        `Appointment in ${timeBeforeText}`,
        `Your appointment with ${role} ${otherPersonName} is coming up on ${appointmentTime.toLocaleString()}`,
        reminderKey,
      );
    }

    //Send email notification
    if (preferences.email_enabled && preferences.email_appointments) {
      await this.emailService.sendAppointmentReminderNotification(
        user.user_id,
        user.email,
        `${user.first_name} ${user.last_name}`,
        appointmentTime,
        `${role} ${otherPersonName}`,
        reminderTimeMinutes,
      );
    }


    this.logger.log(
      `Sent ${timeBeforeText} reminder for appointment ${appointment.appointment_id} to user ${user.user_id}`,
    );
  }
}
