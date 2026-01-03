import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { DoctorSelector } from '../DoctorSelector';
import { SlotSelector } from '../SlotSelector';
import { Button, DateTimePicker } from '@/components';
import { getAvailableSlots, type TimeSlot } from '@/store/appointments/appointmentsApi';
import styles from './AppointmentForm.module.css';

export interface AppointmentFormData {
  doctor_id: number | null;
  appointment_datetime: string;
  duration_minutes: number;
  notes?: string;
}

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  initialData?: Partial<AppointmentFormData>;
  submitLabel?: string;
  onCancel?: () => void;
  isReschedule?: boolean;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Schedule Appointment',
  onCancel,
  isReschedule = false,
}) => {
  const formatDateTimeForInput = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Convert to local datetime string in format YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    defaultValues: {
      doctor_id: initialData?.doctor_id || null,
      appointment_datetime: formatDateTimeForInput(initialData?.appointment_datetime),
      duration_minutes: initialData?.duration_minutes || 30,
      notes: initialData?.notes || '',
    },
  });

  const selectedDoctorId = watch('doctor_id');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const handleDoctorSelect = (doctorId: number) => {
    setValue('doctor_id', doctorId, { shouldValidate: true });
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot(null);
  };

  const handleDateChange = async (value: string) => {
    if (!selectedDoctorId) return;

    // Extract date part (YYYY-MM-DD) from either date input or datetime-local input
    const dateStr = value.includes('T') ? value.split('T')[0] : value;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setSlotsError(null);
    setValue('appointment_datetime', '', { shouldValidate: false }); // Clear datetime when date changes

    if (!dateStr || dateStr.length !== 10) {
      setAvailableSlots([]);
      return;
    }

    try {
      setLoadingSlots(true);
      const slots = await getAvailableSlots(selectedDoctorId, dateStr);
      setAvailableSlots(slots);
      if (slots.length === 0) {
        setSlotsError('No available slots for this date');
      }
    } catch (err: any) {
      console.error('Failed to load slots:', err);
      setSlotsError(err.response?.data?.message || 'Failed to load available slots');
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    // Set the appointment datetime from the selected slot
    // Convert ISO string to datetime-local format for the form
    const localDateTime = formatDateTimeForInput(slot.start_time);
    setValue('appointment_datetime', localDateTime, { shouldValidate: true });
    // Set duration from the slot
    setValue('duration_minutes', slot.duration_minutes, { shouldValidate: true });
  };

  // Initialize date from initialData if rescheduling
  useEffect(() => {
    if (isReschedule && initialData?.appointment_datetime && selectedDoctorId) {
      const date = new Date(initialData.appointment_datetime);
      const dateStr = date.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      handleDateChange(date.toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReschedule, initialData?.appointment_datetime, selectedDoctorId]);

  const onFormSubmit = async (data: AppointmentFormData) => {
    if (!isReschedule && !data.doctor_id) {
      return;
    }

    // If we have a selected slot (for new appointments), use its start_time as ISO string
    let appointmentDateTime = data.appointment_datetime;
    if (!isReschedule && selectedSlot) {
      appointmentDateTime = selectedSlot.start_time;
    } else if (appointmentDateTime) {
      // Convert datetime-local to ISO string
      appointmentDateTime = new Date(appointmentDateTime).toISOString();
    }

    await onSubmit({
      ...data,
      doctor_id: data.doctor_id || initialData?.doctor_id || null,
      appointment_datetime: appointmentDateTime,
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className={styles.form}>
      {!isReschedule && (
        <div className={styles.section}>
          <label className={styles.label}>Select Doctor *</label>
          <DoctorSelector
            selectedDoctorId={selectedDoctorId}
            onSelect={handleDoctorSelect}
            error={errors.doctor_id?.message}
          />
          {errors.doctor_id && <span className={styles.errorText}>{errors.doctor_id.message}</span>}
        </div>
      )}

      {!isReschedule && (
        <div className={styles.section}>
          <DateTimePicker
            label="Select Date *"
            value={selectedDate ? `${selectedDate}T09:00` : ''}
            onChange={(value) => handleDateChange(value)}
            minDate={new Date()}
            placeholder="Select a date for your appointment"
            disabled={!selectedDoctorId}
            showTime={false}
          />
          {!selectedDoctorId && (
            <span className={styles.helperText}>Please select a doctor first</span>
          )}
        </div>
      )}

      {selectedDoctorId && selectedDate && (
        <div className={styles.section}>
          <label className={styles.label}>Select Time Slot *</label>
          <SlotSelector
            slots={availableSlots}
            selectedSlot={selectedSlot}
            onSelect={handleSlotSelect}
            loading={loadingSlots}
            error={slotsError || undefined}
          />
          <input
            type="hidden"
            {...register('appointment_datetime', {
              required: 'Please select an available time slot',
              validate: (value) => {
                if (!value) return 'Please select an available time slot';
                if (!selectedSlot) return 'Please select an available time slot';
                const selectedDate = new Date(value);
                const now = new Date();
                if (selectedDate <= now) {
                  return 'Appointment must be scheduled for a future date and time';
                }
                return true;
              },
            })}
          />
          {selectedSlot && (
            <div className={styles.selectedSlotInfo}>
              <span className={styles.selectedSlotLabel}>Selected:</span>
              <span className={styles.selectedSlotTime}>
                {new Date(selectedSlot.start_time).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
                {' - '}
                {selectedSlot.duration_minutes} minutes
              </span>
            </div>
          )}
          {errors.appointment_datetime && (
            <span className={styles.errorText}>{errors.appointment_datetime.message}</span>
          )}
        </div>
      )}

      {isReschedule && (
        <div className={styles.section}>
          <DateTimePicker
            label="Date & Time *"
            value={watch('appointment_datetime')}
            onChange={(value) => {
              setValue('appointment_datetime', value, { shouldValidate: true });
            }}
            minDate={new Date()}
            error={errors.appointment_datetime?.message}
          />
          <input
            type="hidden"
            {...register('appointment_datetime', {
              required: 'Appointment date and time is required',
              validate: (value) => {
                const selectedDate = new Date(value);
                const now = new Date();
                if (selectedDate <= now) {
                  return 'Appointment must be scheduled for a future date and time';
                }
                return true;
              },
            })}
          />
        </div>
      )}

      {isReschedule && (
        <div className={styles.section}>
          <label htmlFor="duration_minutes" className={styles.label}>
            Duration (minutes) *
          </label>
          <input
            id="duration_minutes"
            type="number"
            min="15"
            max="240"
            step="15"
            {...register('duration_minutes', {
              required: 'Duration is required',
              min: { value: 15, message: 'Minimum duration is 15 minutes' },
              max: { value: 240, message: 'Maximum duration is 240 minutes' },
              valueAsNumber: true,
            })}
            className={styles.input}
          />
          {errors.duration_minutes && (
            <span className={styles.errorText}>{errors.duration_minutes.message}</span>
          )}
        </div>
      )}

      <div className={styles.section}>
        <label htmlFor="notes" className={styles.label}>
          Notes (optional)
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={4}
          className={styles.textarea}
          placeholder="Any additional information about your appointment..."
        />
      </div>

      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !selectedDoctorId || (!isReschedule && !selectedSlot)}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};
