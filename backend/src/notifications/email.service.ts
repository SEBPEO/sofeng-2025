import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationPreferencesService } from '../notification-preferences/notification-preferences.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private configService: ConfigService,
    private notificationPreferencesService: NotificationPreferencesService,
  ) {}

  async sendEmail(to: string, subject: string, htmlContent: string) {
    this.logger.log(`
      Sending email to: ${to}
      Subject: ${subject}
    `);

    try {
      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const smtpPort = this.configService.get<string>('SMTP_PORT');
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASS');
      const smtpFrom = this.configService.get<string>('SMTP_FROM');

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !smtpFrom) {
        this.logger.warn(
          'SMTP configuration is missing. Email will not be sent. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM in your .env file.',
        );
        this.logger.log(`
          Email would be sent to: ${to}
          Subject: ${subject}
          Content: ${htmlContent}
        `);
        return;
      }

      const portNumber = parseInt(smtpPort, 10);
      const isSecure = portNumber === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: portNumber,
        secure: isSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html: htmlContent,
      });

      this.logger.log(`Email successfully sent to: ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}, but continuing with appointment creation:`,
        error,
      );
      return;
    }
  }

  async sendUnreadMessageNotification(
    userId: string,
    userEmail: string,
    senderName: string,
    messageCount: number,
  ) {
    const preferences = await this.notificationPreferencesService.getPreferences(userId);

    if (!preferences.email_enabled || !preferences.email_unread_messages) {
      return;
    }

    const subject = `You have ${messageCount} unread message${messageCount > 1 ? 's' : ''} from ${senderName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #4A90E2; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Medical AI Notetaker</h1>
          </div>
          <div class="content">
            <h2>New Message${messageCount > 1 ? 's' : ''}</h2>
            <p>You have ${messageCount} unread message${messageCount > 1 ? 's' : ''} from <strong>${senderName}</strong>.</p>
            <p>Log in to your account to view and respond to your messages.</p>
            <a href="${this.configService.get('FRONTEND_URL')}/chat" class="button">View Messages</a>
          </div>
          <div class="footer">
            <p>You're receiving this email because you have email notifications enabled.</p>
            <p>You can change your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(userEmail, subject, html);
  }

  async sendAppointmentReminderNotification(
    userId: string,
    userEmail: string,
    userName: string,
    appointmentDate: Date,
    doctorName: string,
    timeBeforeInMinutes: number,
  ) {
    const preferences = await this.notificationPreferencesService.getPreferences(userId);

    if (!preferences.email_enabled || !preferences.email_appointments) {
      return;
    }

    const timeBeforeText =
      timeBeforeInMinutes >= 1440
        ? `${Math.floor(timeBeforeInMinutes / 1440)} day${Math.floor(timeBeforeInMinutes / 1440) > 1 ? 's' : ''}`
        : timeBeforeInMinutes >= 60
          ? `${Math.floor(timeBeforeInMinutes / 60)} hour${Math.floor(timeBeforeInMinutes / 60) > 1 ? 's' : ''}`
          : `${timeBeforeInMinutes} minute${timeBeforeInMinutes > 1 ? 's' : ''}`;

    const subject = `Appointment Reminder - ${timeBeforeText} until your appointment`;
    const formattedDate = appointmentDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
          .appointment-details { 
            background-color: white; 
            padding: 20px; 
            border-left: 4px solid #4A90E2; 
            margin: 20px 0; 
          }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #4A90E2; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Medical AI Notetaker</h1>
          </div>
          <div class="content">
            <h2>📅 Appointment Reminder</h2>
            <p>Hi ${userName},</p>
            <p>This is a reminder that you have an appointment coming up in <strong>${timeBeforeText}</strong>.</p>
            
            <div class="appointment-details">
              <h3>Appointment Details</h3>
              <p><strong>Doctor:</strong> ${doctorName}</p>
              <p><strong>Date & Time:</strong> ${formattedDate}</p>
            </div>
            
            <p>Please make sure to arrive on time. If you need to reschedule, please contact us as soon as possible.</p>
            <a href="${this.configService.get('FRONTEND_URL')}/appointments" class="button">View Appointment</a>
          </div>
          <div class="footer">
            <p>You're receiving this email because you have email notifications enabled for appointments.</p>
            <p>You can change your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(userEmail, subject, html);
  }

  async sendAppointmentScheduledNotification(
    userId: string,
    userEmail: string,
    userName: string,
    appointmentDate: Date,
    doctorName: string,
  ) {
    const preferences = await this.notificationPreferencesService.getPreferences(userId);

    if (!preferences.email_enabled || !preferences.email_appointments) {
      return;
    }

    const subject = 'Appointment Scheduled Successfully';
    const formattedDate = appointmentDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
          .appointment-details { 
            background-color: white; 
            padding: 20px; 
            border-left: 4px solid #4CAF50; 
            margin: 20px 0; 
          }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #4A90E2; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Medical AI Notetaker</h1>
          </div>
          <div class="content">
            <h2>✅ Appointment Confirmed</h2>
            <p>Hi ${userName},</p>
            <p>Your appointment has been successfully scheduled.</p>
            
            <div class="appointment-details">
              <h3>Appointment Details</h3>
              <p><strong>Doctor:</strong> ${doctorName}</p>
              <p><strong>Date & Time:</strong> ${formattedDate}</p>
            </div>
            
            <p>You will receive reminders before your appointment. If you need to reschedule or cancel, please do so through your account.</p>
            <a href="${this.configService.get('FRONTEND_URL')}/appointments" class="button">View Appointment</a>
          </div>
          <div class="footer">
            <p>You're receiving this email because you have email notifications enabled for appointments.</p>
            <p>You can change your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(userEmail, subject, html);
  }

  async sendNotesApprovedNotification(
    userId: string,
    userEmail: string,
    userName: string,
    doctorName: string,
    appointmentDate: Date,
  ) {
    const preferences = await this.notificationPreferencesService.getPreferences(userId);

    if (!preferences.email_enabled || !preferences.email_appointments) {
      return;
    }

    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `Your consultation notes are ready - ${doctorName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
          .appointment-details {
            background-color: white;
            padding: 20px;
            border-left: 4px solid #4A90E2;
            margin: 20px 0;
          }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #4A90E2; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
          }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Medical AI Notetaker</h1>
          </div>
          <div class="content">
            <h2>📋 Your Consultation Notes Are Ready</h2>
            <p>Hi ${userName},</p>
            <p>Dr. ${doctorName} has finalized and approved the notes from your consultation.</p>
            
            <div class="appointment-details">
              <h3>Consultation Details</h3>
              <p><strong>Doctor:</strong> ${doctorName}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
            </div>
            
            <p>The notes include:</p>
            <ul>
              <li>Doctor's observations and recommendations</li>
              <li>AI-generated summary of your visit</li>
              <li>Full transcript of your consultation</li>
            </ul>
            
            <p>You can now view your complete consultation notes in your patient dashboard.</p>
            <a href="${this.configService.get('FRONTEND_URL')}/doctor-notes" class="button">View Doctor Notes</a>
          </div>
          <div class="footer">
            <p>You're receiving this email because you have email notifications enabled.</p>
            <p>You can change your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(userEmail, subject, html);
  }
}
