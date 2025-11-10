import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { getUserByJwt, updateUserProfile, type UpdateProfilePayload } from '@/store/user/userApi';
import { Button, MedicalBackground } from '@/components';
import {
  PersonalInfoSection,
  RoleSelectionSection,
  DoctorInfoSection,
  PatientInfoSection,
} from '../../components';
import styles from './Profile.module.css';

type ProfileFormData = {
  first_name: string;
  last_name: string;
  gender: 'male' | 'female';
  role: 'doctor' | 'patient';
  // Doctor fields
  specialization?: string;
  experience_years?: number;
  clinic_address?: string;
  contact_info?: string;
  working_hours?: string;
  // Patient fields
  date_of_birth?: string;
  emergency_contact?: string;
  conditions?: string;
  medications?: string;
  allergy?: string;
};

export const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialRole, setInitialRole] = useState<'doctor' | 'patient' | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>();

  const selectedRole = watch('role');
  // Role is locked if user already has a profile (doctor_profile or patient_profile)
  const isRoleLocked = initialRole !== null;

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = await getUserByJwt();

      // Pre-fill form with existing data
      if (user.first_name) setValue('first_name', user.first_name);
      if (user.last_name) setValue('last_name', user.last_name);
      if (user.gender) setValue('gender', user.gender);
      if (user.role) {
        setValue('role', user.role);
        // If user has a profile, role is already set and cannot be changed
        if (user.doctor_profile || user.patient_profile) {
          setInitialRole(user.role as 'doctor' | 'patient');
        }
      }

      // Pre-fill doctor profile if exists
      if (user.doctor_profile) {
        setValue('specialization', user.doctor_profile.specialization);
        setValue('experience_years', user.doctor_profile.experience_years || undefined);
        setValue('clinic_address', user.doctor_profile.clinic_address);
        setValue('contact_info', user.doctor_profile.contact_info || undefined);
        setValue('working_hours', user.doctor_profile.working_hours || undefined);
      }

      // Pre-fill patient profile if exists
      if (user.patient_profile) {
        if (user.patient_profile.date_of_birth) {
          const date = new Date(user.patient_profile.date_of_birth);
          setValue('date_of_birth', date.toISOString().split('T')[0]);
        }
        setValue('emergency_contact', user.patient_profile.emergency_contact || undefined);
        setValue('conditions', user.patient_profile.conditions || undefined);
        setValue('medications', user.patient_profile.medications || undefined);
        setValue('allergy', user.patient_profile.allergy || undefined);
      }
    } catch (err) {
      setError('Failed to load user data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSubmitting(true);
      setError(null);

      // Determine which role to use for field selection
      const roleToUse = isRoleLocked ? initialRole : data.role;

      const payload: UpdateProfilePayload = {
        first_name: data.first_name,
        last_name: data.last_name,
        gender: data.gender,
        // Only include role if it's not locked (first time registration)
        // If role is locked, don't send it - backend will use existing role
        ...(isRoleLocked ? {} : { role: data.role }),
      };

      if (roleToUse === 'doctor') {
        payload.specialization = data.specialization;
        payload.experience_years = data.experience_years;
        payload.clinic_address = data.clinic_address;
        payload.contact_info = data.contact_info;
        payload.working_hours = data.working_hours;
      } else if (roleToUse === 'patient') {
        payload.date_of_birth = data.date_of_birth;
        payload.emergency_contact = data.emergency_contact;
        payload.conditions = data.conditions;
        payload.medications = data.medications;
        payload.allergy = data.allergy;
      }

      await updateUserProfile(payload);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <MedicalBackground />
        <div className={styles.loadingState}>Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <MedicalBackground />
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Complete Your Profile</h1>
          <p className={styles.subtitle}>
            Welcome! Please complete your profile to get started.
          </p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Personal Information Section */}
          <PersonalInfoSection register={register} errors={errors} />

          {/* Role Selection Section */}
          <RoleSelectionSection
            watch={watch}
            setValue={setValue}
            errors={errors}
            disabled={isRoleLocked}
          />

          {/* Conditional Doctor Fields */}
          <DoctorInfoSection
            register={register}
            errors={errors}
            isDoctor={selectedRole === 'doctor'}
          />

          {/* Conditional Patient Fields */}
          <PatientInfoSection
            register={register}
            errors={errors}
            isPatient={selectedRole === 'patient'}
          />

          {/* Submit Button */}
          <div className={styles.actions}>
            <Button type="submit" disabled={submitting || !selectedRole}>
              {submitting ? 'Saving...' : 'Complete Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
