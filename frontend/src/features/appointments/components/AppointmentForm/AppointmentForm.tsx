import React from 'react';
import { useForm } from 'react-hook-form';
import { DoctorSelector } from '../DoctorSelector';
import { Button, DateTimePicker } from '@/components';
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

  const handleDoctorSelect = (doctorId: number) => {
    setValue('doctor_id', doctorId, { shouldValidate: true });
  };

  const onFormSubmit = async (data: AppointmentFormData) => {
    if (!isReschedule && !data.doctor_id) {
      return;
    }
    await onSubmit({
      ...data,
      doctor_id: data.doctor_id || initialData?.doctor_id || null,
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
        <Button type="submit" disabled={isSubmitting || !selectedDoctorId}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

