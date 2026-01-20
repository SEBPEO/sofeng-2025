import React, { useEffect, useState } from 'react';
import { Button } from '@/components';
import { getSharedNotesWithMe, type SharedConsultationNote } from '../api';
import styles from './ConsultationSession.module.css';

export const SharedNotes: React.FC = () => {
  const [items, setItems] = useState<SharedConsultationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSharedNotesWithMe();
        setItems(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load shared notes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className={styles.page}>Loading shared notes...</div>;
  if (error) return <div className={styles.page}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Shared Notes</h1>
      </div>
      {items.length === 0 ? (
        <div className={styles.card}>No notes have been shared with you yet.</div>
      ) : (
        <div className={styles.card}>
          <div className={styles.savedList}>
            {items.map((share) => {
              const c = share.consultation;
              const doctorName = `${share.shared_by?.user.first_name || ''} ${
                share.shared_by?.user.last_name || ''
              }`.trim();
              const patientName = c?.appointment
                ? `${c.appointment.patient.user.first_name} ${c.appointment.patient.user.last_name}`
                : 'Patient';
              return (
                <div key={share.share_id} className={styles.savedRow}>
                  <div className={styles.label}>From</div>
                  <div className={styles.value}>{doctorName || 'Doctor'}</div>
                  <div className={styles.label}>Patient</div>
                  <div className={styles.value}>{patientName}</div>
                  <div className={styles.label}>Status</div>
                  <div className={styles.value}>{c?.notes_status || 'UNKNOWN'}</div>
                  <div className={styles.label}>Shared</div>
                  <div className={styles.value}>
                    {new Date(share.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (c?.AI_summary) {
                          alert(c.AI_summary);
                        } else {
                          alert('No summary provided');
                        }
                      }}
                    >
                      View Summary
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
