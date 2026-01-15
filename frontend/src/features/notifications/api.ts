import apiClient from '@/store/apiClient';
import type { Notification, NotificationPreferences, UpdateNotificationPreferencesDto } from './types';

export const notificationApi = {
  // Notification Preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get('/notification-preferences');
    return response.data;
  },

  updatePreferences: async (data: UpdateNotificationPreferencesDto): Promise<NotificationPreferences> => {
    const response = await apiClient.put('/notification-preferences', data);
    return response.data;
  },

  // Notifications
  getNotifications: async (unreadOnly: boolean = false): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications', {
      params: { unreadOnly: unreadOnly ? 'true' : 'false' },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data.count;
  },

  markAsRead: async (notificationId: number): Promise<void> => {
    await apiClient.put(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/read-all');
  },

  deleteNotification: async (notificationId: number): Promise<void> => {
    await apiClient.delete(`/notifications/${notificationId}`);
  },
};
