export interface NotificationPreferences {
  id: number;
  user_id: string;
  email_enabled: boolean;
  email_unread_messages: boolean;
  email_appointments: boolean;
  push_enabled: boolean;
  push_messages: boolean;
  push_appointments: boolean;
  in_app_enabled: boolean;
  in_app_messages: boolean;
  in_app_appointments: boolean;
  reminder_time_1: number;
  reminder_time_2: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  notification_id: number;
  user_id: string;
  type: 'MESSAGE' | 'APPOINTMENT_REMINDER' | 'APPOINTMENT_SCHEDULED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_RESCHEDULED';
  title: string;
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface UpdateNotificationPreferencesDto {
  email_enabled?: boolean;
  email_unread_messages?: boolean;
  email_appointments?: boolean;
  push_enabled?: boolean;
  push_messages?: boolean;
  push_appointments?: boolean;
  in_app_enabled?: boolean;
  in_app_messages?: boolean;
  in_app_appointments?: boolean;
  reminder_time_1?: number;
  reminder_time_2?: number;
}
