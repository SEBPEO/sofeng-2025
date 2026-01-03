import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { AppointmentResponseDto } from './dto/appointment-response.dto';

const prisma = new PrismaClient();

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: any;

  constructor(private configService: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_CALLBACK_URL'),
    );
  }

  private async getAccessToken(userEmail: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { google_refresh_token: true },
      });

      if (!user?.google_refresh_token) {
        this.logger.warn(`No Google refresh token found for user: ${userEmail}`);
        return null;
      }

      this.oauth2Client.setCredentials({
        refresh_token: user.google_refresh_token,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials.access_token;
    } catch (error) {
      this.logger.error(`Failed to get access token for user: ${userEmail}`, error);
      return null;
    }
  }

  async createEvent(appointment: any, doctor: any, userEmail: string): Promise<string | null> {
    try {
      const accessToken = await this.getAccessToken(userEmail);
      if (!accessToken) {
        return null;
      }

      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const startTime = new Date(appointment.appointment_datetime);
      const duration = appointment.duration_minutes || 30;
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const doctorName = `${doctor.user.first_name} ${doctor.user.last_name}`;
      const event = {
        summary: `Appointment with Dr. ${doctorName}`,
        description: `Appointment with Dr. ${doctorName} (${doctor.specialization})\n${
          appointment.notes ? `Notes: ${appointment.notes}` : ''
        }`,
        location: doctor.clinic_address,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      return response.data.id || null;
    } catch (error) {
      this.logger.error('Failed to create Google Calendar event', error);
      return null;
    }
  }

  async updateEvent(
    eventId: string,
    appointment: AppointmentResponseDto,
    userEmail: string,
  ): Promise<void> {
    try {
      const accessToken = await this.getAccessToken(userEmail);
      if (!accessToken) {
        return;
      }

      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const startTime = new Date(appointment.appointment_datetime);
      const duration = appointment.duration_minutes || 30;
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const doctorName = `${appointment.doctor.user.first_name} ${appointment.doctor.user.last_name}`;
      const event = {
        summary: `Appointment with Dr. ${doctorName}`,
        description: `Appointment with Dr. ${doctorName} (${appointment.doctor.specialization})\n${
          appointment.notes ? `Notes: ${appointment.notes}` : ''
        }`,
        location: appointment.doctor.clinic_address,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event,
      });
    } catch (error) {
      this.logger.error('Failed to update Google Calendar event', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string, userEmail: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken(userEmail);
      if (!accessToken) {
        return;
      }

      this.oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      this.logger.error('Failed to delete Google Calendar event', error);
      throw error;
    }
  }
}
