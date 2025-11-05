import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components';
import styles from './DoctorInfoSection.module.css';

interface DoctorInfoSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  isDoctor: boolean;
}

export const DoctorInfoSection = ({ register, errors, isDoctor }: DoctorInfoSectionProps) => {
  if (!isDoctor) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Doctor Information</h2>
      <div className={styles.grid}>
        <Input
          label="Specialization *"
          {...register('specialization', {
            required: isDoctor ? 'Specialization is required' : false,
          })}
          error={errors.specialization?.message as string}
          placeholder="e.g., Cardiology, Pediatrics"
        />
        <Input
          label="Years of Experience"
          type="number"
          {...register('experience_years', { valueAsNumber: true })}
          error={errors.experience_years?.message as string}
          placeholder="5"
        />
      </div>

      <Input
        label="Clinic Address *"
        {...register('clinic_address', {
          required: isDoctor ? 'Clinic address is required' : false,
        })}
        error={errors.clinic_address?.message as string}
        placeholder="123 Medical Center Dr, City, State"
      />

      <div className={styles.grid}>
        <Input
          label="Contact Info"
          {...register('contact_info')}
          error={errors.contact_info?.message as string}
          placeholder="+1 (555) 123-4567"
        />
        <Input
          label="Working Hours"
          {...register('working_hours')}
          error={errors.working_hours?.message as string}
          placeholder="Mon-Fri 9AM-5PM"
        />
      </div>
    </section>
  );
};
