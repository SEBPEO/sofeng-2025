import React, { useEffect, useState } from 'react';
import { notificationApi } from '../api';
import type { NotificationPreferences, UpdateNotificationPreferencesDto } from '../types';
import styles from './NotificationSettings.module.css';

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await notificationApi.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load notification preferences' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const updateData: UpdateNotificationPreferencesDto = {
        email_enabled: preferences.email_enabled,
        email_unread_messages: preferences.email_unread_messages,
        email_appointments: preferences.email_appointments,
        push_enabled: preferences.push_enabled,
        push_messages: preferences.push_messages,
        push_appointments: preferences.push_appointments,
        in_app_enabled: preferences.in_app_enabled,
        in_app_messages: preferences.in_app_messages,
        in_app_appointments: preferences.in_app_appointments,
        reminder_time_1: preferences.reminder_time_1,
        reminder_time_2: preferences.reminder_time_2,
      };

      const updated = await notificationApi.updatePreferences(updateData);
      setPreferences(updated);
      setMessage({ type: 'success', text: 'Notification preferences saved successfully' });
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save notification preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (field: keyof NotificationPreferences) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [field]: !preferences[field],
    });
  };

  const handleReminderTimeChange = (field: 'reminder_time_1' | 'reminder_time_2', value: number) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [field]: value,
    });
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading notification preferences...</div>;
  }

  if (!preferences) {
    return <div className={styles.error}>Failed to load notification preferences</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Notification Settings</h1>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Email Notifications</h2>
        
        <div className={styles.setting}>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={preferences.email_enabled}
              onChange={() => handleToggle('email_enabled')}
              className={styles.checkbox}
            />
            <span>Enable email notifications</span>
          </label>
        </div>

        <div className={styles.subsettings}>
          <div className={styles.setting}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={preferences.email_unread_messages}
                onChange={() => handleToggle('email_unread_messages')}
                disabled={!preferences.email_enabled}
                className={styles.checkbox}
              />
              <span>Unread messages</span>
            </label>
          </div>

          <div className={styles.setting}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={preferences.email_appointments}
                onChange={() => handleToggle('email_appointments')}
                disabled={!preferences.email_enabled}
                className={styles.checkbox}
              />
              <span>Appointment reminders</span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Push Notifications</h2>
        
        <div className={styles.setting}>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={preferences.push_enabled}
              onChange={() => handleToggle('push_enabled')}
              className={styles.checkbox}
            />
            <span>Enable push notifications</span>
          </label>
        </div>

        <div className={styles.subsettings}>
          <div className={styles.setting}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={preferences.push_messages}
                onChange={() => handleToggle('push_messages')}
                disabled={!preferences.push_enabled}
                className={styles.checkbox}
              />
              <span>New messages</span>
            </label>
          </div>

          <div className={styles.setting}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={preferences.push_appointments}
                onChange={() => handleToggle('push_appointments')}
                disabled={!preferences.push_enabled}
                className={styles.checkbox}
              />
              <span>Appointment reminders</span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>In-App Notifications</h2>
        
        <div className={styles.setting}>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={preferences.in_app_enabled}
              onChange={() => handleToggle('in_app_enabled')}
              className={styles.checkbox}
            />
            <span>Enable in-app notifications</span>
          </label>
        </div>

        <div className={styles.subsettings}>
          <div className={styles.setting}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={preferences.in_app_messages}
                onChange={() => handleToggle('in_app_messages')}
                disabled={!preferences.in_app_enabled}
                className={styles.checkbox}
              />
              <span>New messages</span>
            </label>
          </div>

          <div className={styles.setting}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={preferences.in_app_appointments}
                onChange={() => handleToggle('in_app_appointments')}
                disabled={!preferences.in_app_enabled}
                className={styles.checkbox}
              />
              <span>Appointment reminders</span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Appointment Reminder Timing</h2>
        
        <div className={styles.setting}>
          <label className={styles.label}>
            <span>First reminder:</span>
            <select
              value={preferences.reminder_time_1}
              onChange={(e) => handleReminderTimeChange('reminder_time_1', Number(e.target.value))}
              className={styles.select}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>1 day</option>
              <option value={2880}>2 days</option>
              <option value={4320}>3 days</option>
              <option value={10080}>1 week</option>
            </select>
          </label>
        </div>

        <div className={styles.setting}>
          <label className={styles.label}>
            <span>Second reminder:</span>
            <select
              value={preferences.reminder_time_2}
              onChange={(e) => handleReminderTimeChange('reminder_time_2', Number(e.target.value))}
              className={styles.select}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>1 day</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={styles.saveButton}
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};
