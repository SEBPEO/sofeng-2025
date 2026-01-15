import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components';
import { useAppSelector } from '@/store/hooks';
import {
  startConsultation,
  uploadRecording,
  getConsultationByAppointment,
  type Consultation,
} from '../api';
import { AudioRecorder } from '../components/AudioRecorder';
import styles from './ConsultationSession.module.css';
import apiClient from '@/store/apiClient';

export const ConsultationSession: React.FC = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.users.current);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const isDoctor = currentUser?.role === 'doctor';

  useEffect(() => {
    if (!appointmentId) return;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // First try to fetch existing consultation
        const existing = await getConsultationByAppointment(Number(appointmentId));

        if (existing) {
          setConsultation(existing);
          return;
        }

        // If none exists and user is a doctor, start one
        if (isDoctor) {
          const created = await startConsultation(Number(appointmentId));
          setConsultation(created);
        } else {
          setError('Session not started by doctor yet.');
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.message || 'Unable to load consultation');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [appointmentId, isDoctor]);

  const handleUpload = async (file: File) => {
    if (!consultation) return;
    try {
      setUploading(true);
      setUploadMessage(null);
      const updated = await uploadRecording(consultation.consultation_id, file);
      setConsultation(updated);
      setUploadMessage('Recording saved');
    } catch (err: any) {
      console.error(err);
      setUploadMessage(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (recordingId: number, fileName: string) => {
    if (!consultation) return;
    try {
      const response = await apiClient.get(
        `/consultations/${consultation.consultation_id}/recordings/${recordingId}/download`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setUploadMessage(err?.response?.data?.message || 'Download failed');
    }
  };

  if (loading) return <div className={styles.page}>Loading session...</div>;
  if (error) return <div className={styles.page}>{error}</div>;
  if (!consultation) return <div className={styles.page}>No consultation found.</div>;

  const appt = consultation.appointment;
  const patientName = `${appt.patient.user.first_name} ${appt.patient.user.last_name}`;
  const recordingCount = consultation.recordings?.length || 0;
  const maxRecordings = 1;
  const hasReachedLimit = recordingCount >= maxRecordings;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <Button variant="ghost" onClick={() => navigate('/appointments')}>
          ← Back to appointments
        </Button>
        <h1 className={styles.title}>Consultation Session</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.infoRow}>
          <div>
            <div className={styles.label}>Patient</div>
            <div className={styles.value}>{patientName}</div>
          </div>
          <div>
            <div className={styles.label}>Time</div>
            <div className={styles.value}>
              {new Date(appt.appointment_datetime).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          </div>
          <div>
            <div className={styles.label}>Duration</div>
            <div className={styles.value}>{appt.duration_minutes || 30} min</div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Recording</h2>
            {recordingCount > 0 && (
              <span className={styles.badge}>{recordingCount} / {maxRecordings} {maxRecordings === 1 ? 'recording' : 'recordings'}</span>
            )}
          </div>
          {isDoctor ? (
            <>
              {hasReachedLimit ? (
                <div className={styles.note}>Recording limit reached ({maxRecordings} {maxRecordings === 1 ? 'recording' : 'recordings'} maximum).</div>
              ) : (
                <AudioRecorder onSave={handleUpload} />
              )}
            </>
          ) : (
            <div className={styles.note}>Only doctors can record. You can play the recording below when available.</div>
          )}

          {uploading && <div className={styles.note}>Uploading...</div>}
          {uploadMessage && <div className={styles.note}>{uploadMessage}</div>}
          {consultation.recordings && consultation.recordings.length > 0 ? (
            <div className={styles.savedList}>
              {consultation.recordings.map((rec) => {
                const src = rec.file_path.startsWith('http')
                  ? rec.file_path
                  : `${import.meta.env.VITE_API_URL}/${rec.file_path}`;
                const fileName = rec.file_path.split('/').pop() || 'recording';
                return (
                  <div key={rec.consultation_recording_id} className={styles.savedRow}>
                    <div className={styles.label}>Recorded</div>
                    <audio controls src={src} />
                    <div className={styles.value}>
                      {new Date(rec.created_at).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                    <button
                      className={styles.downloadButton}
                      type="button"
                      onClick={() => handleDownload(rec.consultation_recording_id, fileName)}
                    >
                      Download audio
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            !isDoctor && <div className={styles.note}>Recording not yet available.</div>
          )}
        </div>
      </div>
    </div>
  );
};
