# Notification System Setup Guide

This guide explains how to set up and use the new notification system in the Medical AI Notetaker application.

## Overview

The notification system provides:
- **Email notifications** for unread messages and appointment reminders
- **Push notifications** (ready for integration) for messages and appointments
- **In-app notifications** displayed in a notification bell dropdown
- **Customizable appointment reminders** (can set two reminder times)
- **User-configurable preferences** for each notification type

## Backend Setup

### 1. Install Required Dependencies

```bash
cd backend
npm install @nestjs/schedule
```

### 2. Run Database Migration

The notification system requires new database tables. Run the migration:

```bash
npx prisma migrate dev --name add_notifications
```

This will create:
- `NotificationPreferences` table - stores user notification settings
- `Notification` table - stores in-app notifications

### 3. Environment Variables (Optional)

If you want to enable actual email sending, add these to your `.env` file:

```env
# Email Configuration (for SendGrid, AWS SES, or SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourapp.com
FRONTEND_URL=http://localhost:5173
```

**Note:** The email service is currently configured to log emails to the console. To enable actual email sending, uncomment and configure the email sending code in `backend/src/notifications/email.service.ts`.

### 4. Start the Backend

```bash
npm run start:dev
```

The scheduler will automatically run every 10 minutes to check for appointment reminders.

## Frontend Setup

No additional dependencies needed. The notification components are already integrated.

### Start the Frontend

```bash
cd frontend
npm run dev
```

## Features

### 1. Notification Bell

- Located in the top navigation bar
- Shows unread count badge
- Click to view recent notifications
- Mark individual notifications as read or delete them
- "Mark all as read" button for bulk actions

### 2. Notification Settings Page

Access via navigation menu: **Settings** → **Notifications** (or `/notifications` route)

Configure:
- **Email Notifications**
  - Enable/disable email notifications
  - Toggle for unread messages
  - Toggle for appointment reminders
  
- **Push Notifications** (ready for future integration)
  - Enable/disable push notifications
  - Toggle for messages
  - Toggle for appointments
  
- **In-App Notifications**
  - Enable/disable in-app notifications
  - Toggle for messages
  - Toggle for appointments
  
- **Appointment Reminder Timing**
  - First reminder: Choose from 30 minutes to 1 week before
  - Second reminder: Choose from 15 minutes to 1 day before

### 3. Notification Types

- **MESSAGE** - New message received
- **APPOINTMENT_REMINDER** - Upcoming appointment reminder
- **APPOINTMENT_SCHEDULED** - New appointment created
- **APPOINTMENT_CANCELLED** - Appointment cancelled (ready for implementation)
- **APPOINTMENT_RESCHEDULED** - Appointment rescheduled (ready for implementation)

## API Endpoints

### Notification Preferences

- `GET /notification-preferences` - Get user's preferences
- `PUT /notification-preferences` - Update user's preferences

### Notifications

- `GET /notifications` - Get all notifications (query param: `unreadOnly=true` for unread only)
- `GET /notifications/unread-count` - Get count of unread notifications
- `PUT /notifications/:id/read` - Mark a notification as read
- `PUT /notifications/read-all` - Mark all notifications as read
- `DELETE /notifications/:id` - Delete a notification

## How It Works

### Message Notifications

When a message is sent via chat:
1. An in-app notification is created (if enabled)
2. An email is sent to the receiver (if enabled)
3. The notification bell badge updates automatically

### Appointment Notifications

When an appointment is created:
1. Both doctor and patient receive in-app notifications
2. Both receive confirmation emails (if enabled)
3. The system schedules two reminders based on user preferences

### Appointment Reminders

A cron job runs every 10 minutes:
1. Checks all upcoming appointments
2. For each user, checks if reminder time has arrived
3. Sends notifications (in-app, email, and eventually push) based on user preferences
4. Prevents duplicate reminders using a tracking system

## Customization

### Adding More Notification Types

1. Add new type to `NotificationType` enum in `backend/prisma/schema.prisma`
2. Create appropriate email templates in `backend/src/notifications/email.service.ts`
3. Update frontend types in `frontend/src/features/notifications/types.ts`
4. Add icon mapping in `NotificationBell.tsx`

### Integrating Push Notifications

1. Install a push notification service (e.g., Firebase Cloud Messaging, OneSignal)
2. Store device tokens in the database
3. Uncomment and implement push notification sections marked with `// TODO: Send push notification`
4. Update frontend to register for push notifications

### Customizing Email Templates

Edit the HTML templates in `backend/src/notifications/email.service.ts`:
- `sendUnreadMessageNotification`
- `sendAppointmentReminderNotification`
- `sendAppointmentScheduledNotification`

### Adjusting Reminder Check Frequency

In `backend/src/notifications/notification-scheduler.service.ts`, change the cron expression:

```typescript
@Cron(CronExpression.EVERY_5_MINUTES) // Instead of EVERY_10_MINUTES
async handleAppointmentReminders() {
  // ...
}
```

## Testing

### Test Notifications

1. **Message Notifications**: Send a message to another user and check:
   - Notification bell badge increases
   - Notification appears in dropdown
   - Email is logged in console (or sent if configured)

2. **Appointment Notifications**: Create an appointment and check:
   - Both users receive notifications
   - Emails are logged/sent

3. **Appointment Reminders**: 
   - Create an appointment with a time matching your reminder settings
   - Wait for the cron job to run
   - Check for reminder notifications

### Check Logs

Backend logs will show:
- Email sending attempts
- Cron job execution
- Notification creation

## Troubleshooting

### Notifications not appearing

- Check if user preferences are enabled
- Check browser console for errors
- Verify backend is running and database migration completed

### Reminders not sending

- Check backend logs for cron job execution
- Verify appointment is in the future and status is 'scheduled'
- Check user's reminder time preferences

### Email not sending

- Verify SMTP/email service configuration
- Check backend logs for email errors
- Ensure email service code is uncommented and properly configured

## Future Enhancements

- Push notifications for mobile devices
- SMS notifications
- Slack/Teams integration
- Notification history and archive
- Notification preferences per conversation/doctor
- Sound alerts for in-app notifications
- Desktop notifications via browser API
