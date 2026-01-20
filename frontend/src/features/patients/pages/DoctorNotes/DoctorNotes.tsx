import { useEffect, useState } from 'react';
import {
  getMyConsultationNotes,
  type PatientConsultationNote,
} from '@/features/consultations/api';
import styles from './DoctorNotes.module.css';

export function DoctorNotes() {
  const [notes, setNotes] = useState<PatientConsultationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<PatientConsultationNote | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyConsultationNotes();
      setNotes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load consultation notes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewNote = (note: PatientConsultationNote) => {
    setSelectedNote(note);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedNote(null);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading your consultation notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <h2>Unable to load notes</h2>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Doctor Notes</h1>
        <p className={styles.subtitle}>View all approved consultation notes from your doctor visits</p>
      </div>

      {notes.length === 0 ? (
        <div className={styles.emptyStateContainer}>
          <div className={styles.emptyStateIcon}>📋</div>
          <h2>No Notes Yet</h2>
          <p>
            Once your doctor approves consultation notes, they will appear here. Check back after your appointments!
          </p>
        </div>
      ) : (
        <div className={styles.notesList}>
          {notes.map((note) => (
            <div key={note.consultation_id} className={styles.noteCard}>
              <div className={styles.cardContent}>
                <div className={styles.doctorSection}>
                  <h3 className={styles.doctorName}>Dr. {note.doctor_name}</h3>
                  <p className={styles.specialization}>{note.doctor_specialization}</p>
                </div>

                <div className={styles.dateSection}>
                  <p className={styles.dateLabel}>Appointment Date</p>
                  <p className={styles.dateValue}>
                    {new Date(note.appointment_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {note.notes_approved_at && (
                  <div className={styles.approvedSection}>
                    <p className={styles.approvedLabel}>Approved on</p>
                    <p className={styles.approvedValue}>
                      {new Date(note.notes_approved_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              <button
                className={styles.viewNotesButton}
                onClick={() => handleViewNote(note)}
                aria-label={`View full notes from Dr. ${note.doctor_name}`}
              >
                <span className={styles.buttonIcon}>→</span>
                <span className={styles.buttonText}>View Full Notes</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal for viewing full notes */}
      {showModal && selectedNote && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Consultation Notes</h2>
              <button className={styles.closeButton} onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.modalSection}>
                <h3>Doctor Information</h3>
                <p>
                  <strong>Name:</strong> {selectedNote.doctor_name}
                </p>
                <p>
                  <strong>Specialization:</strong> {selectedNote.doctor_specialization}
                </p>
                <p>
                  <strong>Date:</strong>{' '}
                  {new Date(selectedNote.appointment_date).toLocaleString()}
                </p>
              </div>

              {selectedNote.AI_summary && (
                <div className={styles.modalSection}>
                  <h3>AI Summary</h3>
                  <p className={styles.summary}>{selectedNote.AI_summary}</p>
                </div>
              )}

              {selectedNote.transcript && (
                <div className={styles.modalSection}>
                  <h3>Full Transcript</h3>
                  <p className={styles.transcript}>{selectedNote.transcript}</p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeButtonBottom} onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
