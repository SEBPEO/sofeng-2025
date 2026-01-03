import { useState, useEffect } from 'react';
import { Button, Input } from '@/components';
import styles from './AvailabilitySection.module.css';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export interface Availability {
  availability_id?: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_available: boolean;
}

interface AvailabilitySectionProps {
  doctorId: number | null;
}

export const AvailabilitySection = ({ doctorId }: AvailabilitySectionProps) => {
  const [availabilities, setAvailabilities] = useState<Record<number, Availability>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (doctorId) {
      loadAvailability();
    }
  }, [doctorId]);

  const loadAvailability = async () => {
    if (!doctorId) return;

    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/availability/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load availability');
      }

      const data: Availability[] = await response.json();
      const availabilityMap: Record<number, Availability> = {};

      // Initialize all days
      DAYS_OF_WEEK.forEach((day) => {
        availabilityMap[day.value] = {
          doctor_id: doctorId,
          day_of_week: day.value,
          start_time: '09:00',
          end_time: '17:00',
          duration_minutes: 30,
          is_available: false,
        };
      });

      // Populate with existing data
      data.forEach((av) => {
        availabilityMap[av.day_of_week] = av;
      });

      setAvailabilities(availabilityMap);
    } catch (err: any) {
      console.error('Failed to load availability:', err);
      setError(err.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (dayOfWeek: number, field: keyof Availability, value: any) => {
    setAvailabilities((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        [field]: value,
      },
    }));
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!doctorId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const promises = DAYS_OF_WEEK.map(async (day) => {
        const av = availabilities[day.value];
        if (!av) return;

        if (av.availability_id) {
          // Update existing
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/availability/${av.availability_id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                start_time: av.start_time,
                end_time: av.end_time,
                duration_minutes: av.duration_minutes,
                is_available: av.is_available,
              }),
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to update ${day.label}`);
          }
        } else if (av.is_available) {
          // Create new
          const response = await fetch(`${import.meta.env.VITE_API_URL}/availability`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              day_of_week: av.day_of_week,
              start_time: av.start_time,
              end_time: av.end_time,
              duration_minutes: av.duration_minutes,
              is_available: av.is_available,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create ${day.label}`);
          }

          const created = await response.json();
          setAvailabilities((prev) => ({
            ...prev,
            [day.value]: created,
          }));
        }
      });

      await Promise.all(promises);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save availability:', err);
      setError(err.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  if (!doctorId) return null;

  if (loading) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Availability Schedule</h2>
        <div className={styles.loading}>Loading availability...</div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Availability Schedule</h2>
      <p className={styles.description}>
        Set your weekly availability schedule. Patients can only book appointments during these
        times.
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Availability saved successfully!</div>}

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <div className={styles.colDay}>Day</div>
          <div className={styles.colEnabled}>Available</div>
          <div className={styles.colTime}>Start Time</div>
          <div className={styles.colTime}>End Time</div>
          <div className={styles.colDuration}>Duration (min)</div>
        </div>

        {DAYS_OF_WEEK.map((day) => {
          const av = availabilities[day.value];
          if (!av) return null;

          return (
            <div key={day.value} className={styles.tableRow}>
              <div className={styles.colDay}>{day.label}</div>
              <div className={styles.colEnabled}>
                <input
                  type="checkbox"
                  checked={av.is_available}
                  onChange={(e) => handleChange(day.value, 'is_available', e.target.checked)}
                  className={styles.checkbox}
                />
              </div>
              <div className={styles.colTime}>
                <input
                  type="time"
                  value={av.start_time}
                  onChange={(e) => handleChange(day.value, 'start_time', e.target.value)}
                  disabled={!av.is_available}
                  className={styles.timeInput}
                />
              </div>
              <div className={styles.colTime}>
                <input
                  type="time"
                  value={av.end_time}
                  onChange={(e) => handleChange(day.value, 'end_time', e.target.value)}
                  disabled={!av.is_available}
                  className={styles.timeInput}
                />
              </div>
              <div className={styles.colDuration}>
                <input
                  type="number"
                  min="15"
                  max="240"
                  step="15"
                  value={av.duration_minutes}
                  onChange={(e) =>
                    handleChange(day.value, 'duration_minutes', parseInt(e.target.value, 10))
                  }
                  disabled={!av.is_available}
                  className={styles.durationInput}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.actions}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Availability'}
        </Button>
      </div>
    </section>
  );
};


