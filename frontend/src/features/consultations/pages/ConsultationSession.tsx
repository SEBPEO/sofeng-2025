import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components';
import { useAppSelector } from '@/store/hooks';
import {
  startConsultation,
  uploadRecording,
  getConsultationByAppointment,
  generateConsultationNotes,
  updateConsultationNotes,
  approveConsultationNotes,
  getDoctors,
  shareConsultationNotes,
  getConsultationShares,
  revokeConsultationShare,
  type Consultation,
  type ConsultationNotes,
  type SharedConsultationNote,
  type DoctorOption,
} from '../api';
import { AudioRecorder } from '../components/AudioRecorder';
import { ActionItems } from '../components/ActionItems';
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
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState<ConsultationNotes | null>(null);
  const [editableNotes, setEditableNotes] = useState<ConsultationNotes | null>(null);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showActionItems, setShowActionItems] = useState(true); // Показати по дефолту
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharedDoctors, setSharedDoctors] = useState<SharedConsultationNote[]>([]);
  const [sharingDoctor, setSharingDoctor] = useState<number | null>(null);
  const [sharingError, setSharingError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<DoctorOption[]>([]);
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

  const handleShowNotes = async () => {
    if (!consultation) return;

    // Load shared doctors list when opening notes modal
    await handleLoadSharedDoctors();

    // If notes already exist in consultation, show them
    if (consultation.AI_summary) {
      const existingNotes = {
        transcript: consultation.transcript || '',
        summary: consultation.AI_summary,
      };
      setNotes(existingNotes);
      setEditableNotes(existingNotes);
      setShowNotesModal(true);
      return;
    }

    // Otherwise, generate them
    try {
      setLoadingNotes(true);
      setNotesError(null);
      const generatedNotes = await generateConsultationNotes(consultation.consultation_id);
      setNotes(generatedNotes);
      setEditableNotes(generatedNotes);
      setShowNotesModal(true);

      // Update consultation state with new notes
      setConsultation({
        ...consultation,
        transcript: generatedNotes.transcript,
        AI_summary: generatedNotes.summary,
      });
    } catch (err: any) {
      console.error('Failed to generate notes:', err);
      setNotesError(err?.response?.data?.message || 'Failed to generate notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!consultation || !editableNotes) return;

    try {
      setSavingNotes(true);
      setNotesError(null);
      setSaveSuccess(false);

      const savedNotes = await updateConsultationNotes(consultation.consultation_id, editableNotes);

      setNotes(savedNotes);
      setEditableNotes(savedNotes);
      setSaveSuccess(true);

      // Update consultation state
      setConsultation({
        ...consultation,
        transcript: savedNotes.transcript,
        AI_summary: savedNotes.summary,
      });

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save notes:', err);
      setNotesError(err?.response?.data?.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleApproveNotes = async () => {
    if (!consultation) return;

    try {
      setApproving(true);
      setNotesError(null);
      const result = await approveConsultationNotes(consultation.consultation_id);

      // Reflect locked state in UI
      setConsultation({
        ...consultation,
        notes_locked: true,
        notes_status: result.status as Consultation['notes_status'],
        notes_approved_at: result.approvedAt,
        notes_approved_by: currentUser?.user_id || currentUser?.id || null,
      });

      // Prevent further edits
      if (editableNotes) {
        setEditableNotes({ ...editableNotes });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to approve notes:', err);
      setNotesError(err?.response?.data?.message || 'Failed to approve notes');
    } finally {
      setApproving(false);
    }
  };

  const handleLoadSharedDoctors = async () => {
    if (!consultation) return;
    try {
      const shares = await getConsultationShares(consultation.consultation_id);
      setSharedDoctors(shares);
    } catch (err: any) {
      console.error('Failed to load shared doctors:', err);
      setSharingError('Failed to load shared doctors');
    }
  };

  const handleShareNotes = async () => {
    if (!consultation || !sharingDoctor) return;

    try {
      setSharing(true);
      setSharingError(null);
      await shareConsultationNotes(consultation.consultation_id, sharingDoctor, 'read');

      // Reload shared doctors list
      await handleLoadSharedDoctors();

      setSharingDoctor(null);
      setSharingError(null);
    } catch (err: any) {
      console.error('Failed to share notes:', err);
      setSharingError(err?.response?.data?.message || 'Failed to share notes');
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async (shareId: number) => {
    try {
      await revokeConsultationShare(shareId);
      // Reload shared doctors list
      await handleLoadSharedDoctors();
    } catch (err: any) {
      console.error('Failed to revoke share:', err);
      setSharingError(err?.response?.data?.message || 'Failed to revoke share');
    }
  };

  useEffect(() => {
    if (showShareModal && consultation) {
      handleLoadSharedDoctors();
      getDoctors()
        .then((docs) => {
          setAvailableDoctors(docs);
        })
        .catch(() => setSharingError('Failed to load doctors'));
    }
  }, [showShareModal, consultation?.consultation_id]);

  const handleCloseModal = () => {
    setShowNotesModal(false);
    setNotesError(null);
    setSaveSuccess(false);
    // Reset editable notes to original when closing
    if (notes) {
      setEditableNotes(notes);
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
              <span className={styles.badge}>
                {recordingCount} / {maxRecordings}{' '}
                {maxRecordings === 1 ? 'recording' : 'recordings'}
              </span>
            )}
          </div>
          {isDoctor ? (
            <>
              {hasReachedLimit ? (
                <div className={styles.note}>
                  Recording limit reached ({maxRecordings}{' '}
                  {maxRecordings === 1 ? 'recording' : 'recordings'} maximum).
                </div>
              ) : (
                <AudioRecorder onSave={handleUpload} />
              )}
            </>
          ) : (
            <div className={styles.note}>
              Only doctors can record. You can play the recording below when available.
            </div>
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className={styles.downloadButton}
                        type="button"
                        onClick={() => handleDownload(rec.consultation_recording_id, fileName)}
                      >
                        Download audio
                      </button>
                      <button
                        className={styles.downloadButton}
                        type="button"
                        onClick={handleShowNotes}
                        disabled={loadingNotes}
                        style={{ opacity: loadingNotes ? 0.6 : 1 }}
                      >
                        {loadingNotes ? 'Generating...' : 'Show notes'}
                      </button>
                      <button
                        className={styles.downloadButton}
                        type="button"
                        onClick={() => setShowActionItems(!showActionItems)}
                      >
                        {showActionItems ? 'Hide treatment plan' : 'Show treatment plan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !isDoctor && <div className={styles.note}>Recording not yet available.</div>
          )}
        </div>

        {/* Action Items Section */}
        {showActionItems && consultation && (
          <ActionItems consultationId={consultation.consultation_id} isDoctor={isDoctor} />
        )}
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Consultation Notes</h2>
              <button className={styles.closeButton} onClick={handleCloseModal} type="button">
                ×
              </button>
            </div>
            {notesError && <div className={styles.error}>{notesError}</div>}
            {saveSuccess && <div className={styles.success}>Changes saved successfully!</div>}
            {editableNotes && (
              <div className={styles.notesContent}>
                <div className={styles.notesSection}>
                  <h3>AI Summary</h3>
                  {isDoctor && !consultation?.notes_locked ? (
                    <textarea
                      className={styles.editableText}
                      value={editableNotes.summary}
                      onChange={(e) =>
                        setEditableNotes({ ...editableNotes, summary: e.target.value })
                      }
                      placeholder="Enter consultation summary..."
                      rows={20}
                    />
                  ) : (
                    <div className={styles.notesText}>{editableNotes.summary}</div>
                  )}
                </div>
                {consultation?.notes_approved_at && (
                  <div className={styles.note}>
                    Approved on{' '}
                    {new Date(consultation.notes_approved_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                )}
                {isDoctor && !consultation?.notes_locked && (
                  <div className={styles.notesActions}>
                    <Button
                      variant="primary"
                      onClick={handleSaveNotes}
                      disabled={savingNotes || !editableNotes}
                    >
                      {savingNotes ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleApproveNotes}
                      disabled={approving || savingNotes || !editableNotes}
                    >
                      {approving ? 'Approving...' : 'Approve & Lock'}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowShareModal(true)}>
                      Share with Doctor
                    </Button>
                  </div>
                )}
                {isDoctor && (
                  <div className={styles.sharedWithList}>
                    <h4>Shared with:</h4>
                    {sharedDoctors.length > 0 ? (
                      <ul>
                        {sharedDoctors.map((share) => (
                          <li key={share.share_id}>
                            {share.shared_with?.user.first_name} {share.shared_with?.user.last_name}
                            <button
                              type="button"
                              onClick={() => handleRevokeShare(share.share_id)}
                              style={{ marginLeft: '8px', color: 'red' }}
                            >
                              Revoke
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Not shared with anyone yet</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Notes Modal */}
      {showShareModal && isDoctor && (
        <div className={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Share Consultation Notes</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowShareModal(false)}
                type="button"
              >
                ×
              </button>
            </div>
            {sharingError && <div className={styles.error}>{sharingError}</div>}
            <div className={styles.notesContent}>
              <p>Share these notes with another doctor. They will have read-only access.</p>
              <select
                value={sharingDoctor || ''}
                onChange={(e) => setSharingDoctor(e.target.value ? parseInt(e.target.value) : null)}
                style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
              >
                <option value="">Select a doctor...</option>
                {availableDoctors.length === 0 && (
                  <option value="" disabled>
                    No doctors available
                  </option>
                )}
                {availableDoctors.map((doc) => (
                  <option key={doc.doctor_profile.doctor_id} value={doc.doctor_profile.doctor_id}>
                    {doc.first_name} {doc.last_name} ({doc.email})
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={handleShareNotes}
                disabled={sharing || !sharingDoctor}
              >
                {sharing ? 'Sharing...' : 'Share'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
