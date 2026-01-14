import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { getUserByJwt, updateUserProfile, type UpdateProfilePayload } from '@/store/user/userApi';
import { Button } from '@/components';
import {
  PersonalInfoSection,
  RoleSelectionSection,
  DoctorInfoSection,
  PatientInfoSection,
  AvailabilitySection,
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
  // Consents (stored client-side)
  consent_data_storage: boolean;
  consent_share_notes: boolean;
};

export const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialRole, setInitialRole] = useState<'doctor' | 'patient' | null>(null);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    mode: 'onChange',
    defaultValues: {
      consent_data_storage: false,
      consent_share_notes: false,
    },
  });

  const selectedRole = watch('role');
  // Role is locked if user already has a profile (doctor_profile or patient_profile)
  const isRoleLocked = initialRole !== null;

  // Onboarding completion checks
  const roleChosen = !!selectedRole;
  const doctorReq = selectedRole === 'doctor' ? !!watch('specialization') && !!watch('clinic_address') : true;
  const patientReq = selectedRole === 'patient' ? !!watch('date_of_birth') && !!watch('emergency_contact') : true;
  const summaryReq = !!(watch('conditions') || watch('medications') || watch('allergy'));
  const consentReq = watch('consent_data_storage') && watch('consent_share_notes');
  const steps = [
    { label: 'Choose your role', done: roleChosen },
    { label: selectedRole === 'doctor' ? 'Add specialization & clinic address' : 'Add date of birth & emergency contact', done: selectedRole === 'doctor' ? doctorReq : patientReq },
    // Only show medical summary step for patients
    ...(selectedRole === 'patient' ? [{
      label: 'Add a quick medical summary (conditions/meds/allergies)',
      done: summaryReq
    }] : []),
    { label: 'Confirm consent preferences', done: consentReq },
  ];
  const onboardingComplete = steps.every((s) => s.done);
  const remainingCount = steps.filter((s) => !s.done).length;

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
        setDoctorId(user.doctor_profile.doctor_id);
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

      // Prefill consents from localStorage
      const storedConsents = localStorage.getItem('profile_consents');
      if (storedConsents) {
        const parsed = JSON.parse(storedConsents);
        setValue('consent_data_storage', !!parsed.consent_data_storage);
        setValue('consent_share_notes', !!parsed.consent_share_notes);
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

      // Store consents locally
      localStorage.setItem(
        'profile_consents',
        JSON.stringify({
          consent_data_storage: data.consent_data_storage,
          consent_share_notes: data.consent_share_notes,
        }),
      );

      if (onboardingComplete) {
        setShowCongrats(true);
      }
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
        <div className={styles.loadingState}>Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={`${styles.badge} ${onboardingComplete ? styles.badgeComplete : ''}`}>
            {onboardingComplete
              ? 'Onboarding Complete 🎉'
              : `Finish setup (${remainingCount} step${remainingCount === 1 ? '' : 's'} left)`}
          </div>
          <h1 className={styles.title}>Complete Your Profile</h1>
          <p className={styles.subtitle}>
            A few quick steps to get you ready.
          </p>
        </div>

        <div className={styles.onboardingPanel}>
          {steps.map((step, idx) => (
            <div key={idx} className={styles.stepItem}>
              <span className={`${styles.stepDot} ${step.done ? styles.stepDotDone : ''}`}>
                {step.done ? '✓' : idx + 1}
              </span>
              <span className={step.done ? styles.stepDone : ''}>{step.label}</span>
            </div>
          ))}
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

          <section className={styles.consentSection}>
            <h2 className={styles.sectionTitle}>Consent & Data Preferences</h2>
            <label className={styles.checkboxRow}>
              <input type="checkbox" {...register('consent_data_storage', { required: true })} />
              <div>
                <div className={styles.checkboxLabel}>Store my data securely</div>
                <div className={styles.checkboxText}>Allows us to keep your profile and medical summary accessible for care.</div>
              </div>
            </label>
            <label className={styles.checkboxRow}>
              <input type="checkbox" {...register('consent_share_notes', { required: true })} />
              <div>
                <div className={styles.checkboxLabel}>Share anonymized notes with my care team</div>
                <div className={styles.checkboxText}>Enables collaboration between assigned doctors for better outcomes.</div>
              </div>
            </label>
          </section>

          {/* Submit Button */}
          <div className={styles.actions}>
            <Button type="submit" disabled={submitting || !selectedRole}>
              {submitting ? 'Saving...' : onboardingComplete ? 'Save & Continue' : 'Save progress'}
            </Button>
          </div>
        </form>

        {/* Availability Section for Doctors */}
        {doctorId && <AvailabilitySection doctorId={doctorId} />}
      </div>

      {showCongrats && (
        <div className={styles.modalOverlay} onClick={() => setShowCongrats(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalBadge}>Complete</div>
            <h3>Nice work! 🎉</h3>
            <p>Your onboarding is complete. You can always update details here.</p>
            <Button onClick={() => setShowCongrats(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
