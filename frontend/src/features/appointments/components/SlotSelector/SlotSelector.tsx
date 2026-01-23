import React from 'react';
import type { TimeSlot } from '@/store/appointments/appointmentsApi';
import styles from './SlotSelector.module.css';

interface SlotSelectorProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  loading?: boolean;
  error?: string;
}

export const SlotSelector: React.FC<SlotSelectorProps> = ({
  slots,
  selectedSlot,
  onSelect,
  loading = false,
  error,
}) => {
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading available slots...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          No available time slots for this date. Please select another date.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.label}>Available Time Slots</div>
      <div className={styles.slotsGrid}>
        {slots.map((slot) => {
          const isSelected =
            selectedSlot?.start_time === slot.start_time &&
            selectedSlot?.duration_minutes === slot.duration_minutes;

          // Create a unique key from start_time
          const slotKey = `${slot.start_time}-${slot.duration_minutes}`;

          return (
            <button
              key={slotKey}
              type="button"
              className={`${styles.slotButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelect(slot)}
              aria-pressed={isSelected}
              aria-label={`Select time slot at ${formatTime(slot.start_time)} for ${slot.duration_minutes} minutes`}
            >
              <span className={styles.slotTime}>{formatTime(slot.start_time)}</span>
              <span className={styles.slotDuration}>{slot.duration_minutes} min</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
