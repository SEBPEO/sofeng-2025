import { useEffect, useState } from 'react';
import styles from './MyPatients.module.css';
import { getMyPatients, unassignPatient } from '@/store/patients/patientApi';
import type { Patient } from '@/store/patients/patientSchema';

export const MyPatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const handleRemove = async (patientId: number) => {
    if (!window.confirm('Are you sure you want to remove this patient?')) {
      return;
    }

    try {
      setRemovingId(patientId);
      await unassignPatient(patientId);

      // Remove from list
      setPatients(patients.filter((p) => p.patient_id !== patientId));

      setSuccessMsg('Patient removed from My Patients');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to remove patient:', err);
      setError('Failed to remove patient. Try again.');
    } finally {
      setRemovingId(null);
    }
  };

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
        <h1 className={styles.title}>My Patients</h1>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Patients</h1>

      {successMsg && <div className={styles.success}>{successMsg}</div>}

      {patients.length === 0 ? (
        <p className={styles.description}>
          You don't have any patients assigned yet. Go to "Available Patients" to add some.
        </p>
      ) : (
        <div className={styles.patientsList}>
          {patients.map((patient) => (
            <div key={patient.patient_id} className={styles.patientCard}>
              <div className={styles.patientHeader}>
                <div>
                  <h3 className={styles.patientName}>
                    {patient.first_name} {patient.last_name}
                  </h3>
                  <p className={styles.patientEmail}>{patient.email}</p>
                </div>
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

              <button
                className={styles.removeButton}
                onClick={() => handleRemove(patient.patient_id)}
                disabled={removingId === patient.patient_id}
              >
                {removingId === patient.patient_id ? 'Removing...' : '✕ Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
