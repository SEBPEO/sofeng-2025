import type { UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { RadioGroup } from '@/components';
import styles from './RoleSelectionSection.module.css';

interface RoleSelectionSectionProps {
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors<any>;
}

export const RoleSelectionSection = ({ watch, setValue, errors }: RoleSelectionSectionProps) => {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Role Selection</h2>
      <RadioGroup
        name="role"
        label="I am a *"
        value={watch('role')}
        onChange={(value) => setValue('role', value as 'doctor' | 'patient')}
        options={[
          {
            value: 'doctor',
            label: 'Doctor',
            description: 'Provide medical consultations and manage appointments',
          },
          {
            value: 'patient',
            label: 'Patient',
            description: 'Schedule appointments and receive medical care',
          },
        ]}
        error={errors.role?.message as string}
      />
    </section>
  );
};
