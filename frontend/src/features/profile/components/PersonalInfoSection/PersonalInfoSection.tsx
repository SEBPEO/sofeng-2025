import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input, Select } from '@/components';
import styles from './PersonalInfoSection.module.css';

interface PersonalInfoSectionProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
}

export const PersonalInfoSection = ({ register, errors }: PersonalInfoSectionProps) => {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Personal Information</h2>
      <div className={styles.grid}>
        <Input
          label="First Name *"
          {...register('first_name', { required: 'First name is required' })}
          error={errors.first_name?.message as string}
          placeholder="John"
        />
        <Input
          label="Last Name *"
          {...register('last_name', { required: 'Last name is required' })}
          error={errors.last_name?.message as string}
          placeholder="Doe"
        />
      </div>

      <Select
        label="Gender *"
        {...register('gender', { required: 'Gender is required' })}
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
        ]}
        error={errors.gender?.message as string}
        placeholder="Select your gender"
      />
    </section>
  );
};
