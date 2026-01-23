import { useEffect, useState } from 'react';
import styles from './Patients.module.css';
import { getMyPatients } from '@/store/patients/patientApi';
import type { Patient } from '@/store/patients/patientSchema';

export const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMyPatients();
        setPatients(data);
      } catch (err) {
        console.error('Failed to fetch patients:', err);
        setError('Failed to load patients. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Loading patients...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Patients</h1>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Patients</h1>

      {patients.length === 0 ? (
        <p className={styles.description}>You don't have any patients assigned yet.</p>
      ) : (
        <div className={styles.patientsList}>
          {patients.map((patient) => (
            <div key={patient.patient_id} className={styles.patientCard}>
              <div className={styles.patientHeader}>
                <h3 className={styles.patientName}>
                  {patient.first_name} {patient.last_name}
                </h3>
                <span className={styles.patientGender}>{patient.gender}</span>
              </div>

              <div className={styles.patientInfo}>
                <p>
                  <strong>Email:</strong> {patient.email}
                </p>
                {patient.date_of_birth && (
                  <p>
                    <strong>DOB:</strong> {new Date(patient.date_of_birth).toLocaleDateString()}
                  </p>
                )}
                {patient.conditions && (
                  <p>
                    <strong>Conditions:</strong> {patient.conditions}
                  </p>
                )}
                {patient.medications && (
                  <p>
                    <strong>Medications:</strong> {patient.medications}
                  </p>
                )}
                {patient.allergy && (
                  <p>
                    <strong>Allergies:</strong> {patient.allergy}
                  </p>
                )}
                {patient.emergency_contact && (
                  <p>
                    <strong>Emergency:</strong> {patient.emergency_contact}
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
