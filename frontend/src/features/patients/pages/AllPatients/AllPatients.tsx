import { useEffect, useState } from 'react';
import styles from './AllPatients.module.css';
import { getAvailablePatients, assignPatient } from '@/store/patients/patientApi';
import type { Patient } from '@/store/patients/patientSchema';

export const AllPatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAvailablePatients();
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

  const handleAssign = async (patientId: number) => {
    try {
      setAssigningId(patientId);
      setError(null);
      await assignPatient(patientId);

      // Remove from list since it's now assigned
      setPatients(patients.filter((p) => p.patient_id !== patientId));

      setSuccessMsg('Patient added to My Patients!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to assign patient:', err);
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to add patient. Please try again.';
      setError(errorMsg);
    } finally {
      setAssigningId(null);
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
        <h1 className={styles.title}>Available Patients</h1>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Available Patients</h1>

      {successMsg && <div className={styles.success}>{successMsg}</div>}

      {patients.length === 0 ? (
        <p className={styles.description}>
          All available patients have been assigned to your list.
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
                className={styles.assignButton}
                onClick={() => handleAssign(patient.patient_id)}
                disabled={assigningId === patient.patient_id}
              >
                {assigningId === patient.patient_id ? 'Adding...' : '+ Add to My Patients'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
