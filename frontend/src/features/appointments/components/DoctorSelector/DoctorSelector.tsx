import React, { useState, useEffect, useMemo } from 'react';
import { getDoctors, type Doctor } from '@/store/appointments/appointmentsApi';
import styles from './DoctorSelector.module.css';

interface DoctorSelectorProps {
  selectedDoctorId: number | null;
  onSelect: (doctorId: number) => void;
  error?: string;
}

export const DoctorSelector: React.FC<DoctorSelectorProps> = ({
  selectedDoctorId,
  onSelect,
  error,
}) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const data = await getDoctors();
        setDoctors(data);
      } catch (err) {
        console.error('Failed to fetch doctors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    if (!searchTerm.trim()) {
      return doctors;
    }

    const term = searchTerm.toLowerCase();
    return doctors.filter(
      (doctor) =>
        doctor.user.first_name.toLowerCase().includes(term) ||
        doctor.user.last_name.toLowerCase().includes(term) ||
        doctor.specialization.toLowerCase().includes(term) ||
        doctor.clinic_address.toLowerCase().includes(term),
    );
  }, [doctors, searchTerm]);

  if (loading) {
    return <div className={styles.loading}>Loading doctors...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by name, specialization, or clinic address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.doctorsList}>
        {filteredDoctors.length === 0 ? (
          <div className={styles.empty}>
            {searchTerm ? 'No doctors found matching your search.' : 'No doctors available.'}
          </div>
        ) : (
          filteredDoctors.map((doctor) => {
            const doctorName = `${doctor.user.first_name} ${doctor.user.last_name}`;
            const isSelected = selectedDoctorId === doctor.doctor_id;

            return (
              <div
                key={doctor.doctor_id}
                className={`${styles.doctorCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => onSelect(doctor.doctor_id)}
              >
                <div className={styles.doctorInfo}>
                  <h3 className={styles.doctorName}>Dr. {doctorName}</h3>
                  <p className={styles.specialization}>{doctor.specialization}</p>
                  <p className={styles.clinicAddress}>{doctor.clinic_address}</p>
                  {doctor.experience_years && (
                    <p className={styles.experience}>
                      {doctor.experience_years} years of experience
                    </p>
                  )}
                </div>
                {isSelected && <div className={styles.checkmark}>✓</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
