import { useEffect, useState } from 'react';
import styles from './MyDoctor.module.css';
import { getMyDoctor } from '@/store/patients/patientApi';

interface DoctorInfo {
  doctor_id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialization: string;
  clinic_address: string;
  contact_info: string | null;
  working_hours: string | null;
  experience_years: number | null;
}

export const MyDoctor = () => {
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMyDoctor();
        setDoctors(data);
      } catch (err) {
        console.error('Failed to fetch doctor:', err);
        setError('Failed to load your doctor information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>My Doctor</h1>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Doctor</h1>

      {doctors.length === 0 ? (
        <p className={styles.description}>
          No doctor has assigned you yet. Once a doctor picks you up, they will appear here.
        </p>
      ) : (
        <div className={styles.doctorsList}>
          {doctors.map((doctor) => (
            <div key={doctor.doctor_id} className={styles.doctorCard}>
              <div className={styles.doctorHeader}>
                <h3 className={styles.doctorName}>
                  Dr. {doctor.first_name} {doctor.last_name}
                </h3>
                <span className={styles.specialization}>{doctor.specialization}</span>
              </div>

              <div className={styles.doctorInfo}>
                <p>
                  <strong>Email:</strong> {doctor.email}
                </p>
                {doctor.clinic_address && (
                  <p>
                    <strong>Clinic:</strong> {doctor.clinic_address}
                  </p>
                )}
                {doctor.experience_years && (
                  <p>
                    <strong>Experience:</strong> {doctor.experience_years} years
                  </p>
                )}
                {doctor.working_hours && (
                  <p>
                    <strong>Working Hours:</strong> {doctor.working_hours}
                  </p>
                )}
                {doctor.contact_info && (
                  <p>
                    <strong>Contact:</strong> {doctor.contact_info}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
