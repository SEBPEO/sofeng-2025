import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components';
import styles from './PatientInfoSection.module.css';

interface PatientInfoSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  isPatient: boolean;
}

export const PatientInfoSection = ({ register, errors, isPatient }: PatientInfoSectionProps) => {
  if (!isPatient) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Patient Information</h2>
      <div className={styles.grid}>
        <Input
          label="Date of Birth *"
          type="date"
          {...register('date_of_birth', {
            required: 'Date of birth is required',
          })}
          error={errors.date_of_birth?.message as string}
        />
        <Input
          label="Emergency Contact (Phone) *"
          {...register('emergency_contact', {
            required: 'Emergency contact phone number is required',
            pattern: {
              value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
              message: 'Please enter a valid phone number',
            },
          })}
          error={errors.emergency_contact?.message as string}
          placeholder="+1 (555) 987-6543"
        />
      </div>

      <Input
        label="Medical Conditions"
        {...register('conditions')}
        error={errors.conditions?.message as string}
        placeholder="Any chronic conditions or diagnoses"
      />

      <Input
        label="Current Medications"
        {...register('medications')}
        error={errors.medications?.message as string}
        placeholder="List any medications you're currently taking"
      />

      <Input
        label="Allergies"
        {...register('allergy')}
        error={errors.allergy?.message as string}
        placeholder="Any known allergies"
      />
    </section>
  );
};
