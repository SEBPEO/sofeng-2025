import { useState, useEffect } from 'react';
import { requestAccountDeletion, requestDataExport, getUserDataExport } from '@/store/user/userApi';
import styles from './AccountManagement.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>{title}</h2>
        <p className={styles.modalMessage}>{message}</p>
        {title.includes('Delete') && (
          <textarea
            className={styles.reasonInput}
            placeholder="Why are you deleting your account? (optional)"
            // Note: value would need to be managed at component level
          />
        )}
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={isDangerous ? styles.dangerButton : styles.confirmButton}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AccountManagement = () => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAllExports, setShowAllExports] = useState(false);
  const [requests, setRequests] = useState<{
    deletionRequests: Array<{
      request_id: number;
      status: string;
      requested_at: string;
      reason?: string | null;
    }>;
    exportRequests: Array<{ request_id: number; status: string; requested_at: string }>;
  }>({ deletionRequests: [], exportRequests: [] });

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const result = await requestAccountDeletion(deletionReason);
      setMessage({
        type: 'success',
        text: result.message,
      });
      setIsDeleteDialogOpen(false);
      setDeletionReason('');
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to request account deletion',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRequests = async () => {
    try {
      const res = await (await import('@/store/user/userApi')).getPrivacyRequests();
      setRequests({
        deletionRequests: res.deletionRequests,
        exportRequests: res.exportRequests,
      });
    } catch (e) {
      // ignore refresh errors in UI
    }
  };

  const cancelDeletion = async (id: number) => {
    setIsLoading(true);
    try {
      const api = await import('@/store/user/userApi');
      await api.cancelDeletionRequest(id);
      await refreshRequests();
      setMessage({ type: 'success', text: 'Deletion request cancelled.' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Failed to cancel request' });
    } finally {
      setIsLoading(false);
    }
  };

  const approveDeletion = async (id: number) => {
    if (
      !confirm(
        '⚠️ FINAL WARNING: This will permanently delete your account and all data. This cannot be undone. Continue?',
      )
    ) {
      return;
    }
    setIsLoading(true);
    try {
      const api = await import('@/store/user/userApi');
      await api.approveDeletionRequest(id);

      // Clear auth token and redirect immediately to login page
      localStorage.removeItem('token');
      window.location.href = '/login';
    } catch (e: any) {
      setMessage({
        type: 'error',
        text: e?.response?.data?.message || 'Failed to approve deletion',
      });
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatExportToText = (data: any): string => {
    const lines: string[] = [];

    const pad = (label: string, value: string | number | null | undefined) =>
      `${label}: ${value ?? ''}`;

    const hr = () => lines.push(''.padEnd(60, '-'));

    lines.push('Account Data Export');
    lines.push(`Generated: ${new Date().toISOString()}`);
    hr();

    // User
    lines.push('USER');
    lines.push(pad('- ID', data.user?.user_id));
    lines.push(
      pad('- Name', `${data.user?.first_name ?? ''} ${data.user?.last_name ?? ''}`.trim()),
    );
    lines.push(pad('- Email', data.user?.email));
    lines.push(pad('- Role', data.user?.role));
    lines.push(pad('- Gender', data.user?.gender));
    lines.push(pad('- Created At', data.user?.createdAt));
    lines.push(pad('- Last Login', data.user?.lastLogin));
    hr();

    // Profile (Doctor or Patient)
    lines.push('PROFILE');
    if (data.profile) {
      Object.entries(data.profile).forEach(([k, v]) => {
        if (v !== null && v !== undefined) lines.push(`- ${k}: ${v as any}`);
      });
    } else {
      lines.push('- (none)');
    }
    hr();

    // Appointments
    const appts = Array.isArray(data.appointments) ? data.appointments : [];
    lines.push(`APPOINTMENTS (${appts.length})`);
    appts.forEach((a: any, i: number) => {
      lines.push(`#${i + 1}`);
      if (a.appointment_datetime) lines.push(pad('- Date', a.appointment_datetime));
      if (a.doctor?.user)
        lines.push(
          pad(
            '- Doctor',
            `${a.doctor.user.first_name ?? ''} ${a.doctor.user.last_name ?? ''}`.trim(),
          ),
        );
      if (a.patient?.user)
        lines.push(
          pad(
            '- Patient',
            `${a.patient.user.first_name ?? ''} ${a.patient.user.last_name ?? ''}`.trim(),
          ),
        );
      if (a.status) lines.push(pad('- Status', a.status));
      lines.push('');
    });
    if (!appts.length) lines.push('(none)');
    hr();

    // Consultations
    const cons = Array.isArray(data.consultations) ? data.consultations : [];
    lines.push(`CONSULTATIONS (${cons.length})`);
    cons.forEach((c: any, i: number) => {
      lines.push(`#${i + 1}`);
      if (c.consultation_id) lines.push(pad('- Consultation ID', c.consultation_id));
      if (c.notes_status) lines.push(pad('- Notes Status', c.notes_status));
      if (c.notes_approved_at) lines.push(pad('- Approved At', c.notes_approved_at));
      if (c.AI_summary) {
        lines.push('- Summary:');
        lines.push(String(c.AI_summary));
      }
      lines.push('');
    });
    if (!cons.length) lines.push('(none)');
    hr();

    // Messages (flattened)
    const msgs = Array.isArray(data.messages) ? data.messages : [];
    lines.push(`MESSAGES (${msgs.length})`);
    msgs.slice(0, 200).forEach((m: any, i: number) => {
      lines.push(`#${i + 1}`);
      if (m.sender_id) lines.push(pad('- From', m.sender_id));
      if (m.receiver_id) lines.push(pad('- To', m.receiver_id));
      if (m.sent_at) lines.push(pad('- Sent', m.sent_at));
      if (m.content) {
        const content = String(m.content).replace(/\s+/g, ' ').slice(0, 500);
        lines.push(`- Content: ${content}${m.content.length > 500 ? '…' : ''}`);
      }
      lines.push('');
    });
    if (!msgs.length) lines.push('(none)');
    if (msgs.length > 200) lines.push('… truncated for readability');
    hr();

    // Notifications
    const notifs = Array.isArray(data.notifications) ? data.notifications : [];
    lines.push(`NOTIFICATIONS (${notifs.length})`);
    notifs.forEach((n: any, i: number) => {
      lines.push(`#${i + 1}`);
      if (n.type) lines.push(pad('- Type', n.type));
      if (n.title) lines.push(pad('- Title', n.title));
      if (n.message) lines.push(pad('- Message', n.message));
      if (n.is_read !== undefined) lines.push(pad('- Read', n.is_read ? 'yes' : 'no'));
      if (n.created_at) lines.push(pad('- Created', n.created_at));
      lines.push('');
    });
    if (!notifs.length) lines.push('(none)');

    return lines.join('\n');
  };

  const handleDownloadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      // Create audit record
      await requestDataExport();
      // Download data
      const data = await getUserDataExport();
      const txtString = formatExportToText(data);
      const blob = new Blob([txtString], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-data-${new Date().toISOString()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      await refreshRequests();
      setMessage({
        type: 'success',
        text: 'Your data export has been downloaded successfully',
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to download data export',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Account Management</h2>
      <p className={styles.subtitle}>Manage your account and personal data</p>

      {message && <div className={`${styles.alert} ${styles[message.type]}`}>{message.text}</div>}

      <div className={styles.section}>
        <div className={styles.optionCard}>
          <div className={styles.optionContent}>
            <h3 className={styles.optionTitle}>📥 Export My Data</h3>
            <p className={styles.optionDescription}>
              Download a complete copy of your personal data as a TXT file. Includes profile,
              appointments, consultations, messages, and notifications. Each download is logged for
              audit purposes.
            </p>
          </div>
          <div className={styles.optionActions}>
            <button
              className={styles.primaryButton}
              onClick={handleDownloadData}
              disabled={isLoading}
            >
              {isLoading ? 'Downloading…' : 'Download My Data'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.optionCard}>
          <div className={styles.optionContent}>
            <h3 className={styles.optionTitle}>🕒 Privacy Audit Trail</h3>
            <p className={styles.optionDescription}>
              View your recent data exports and account deletion requests.
            </p>

            <div>
              <strong>Data Export History</strong>
              {requests.exportRequests.length === 0 && <div className={styles.muted}>(none)</div>}
              {requests.exportRequests.length > 0 && (
                <>
                  {requests.exportRequests
                    .slice()
                    .reverse()
                    .slice(0, showAllExports ? undefined : 5)
                    .map((r, i) => (
                      <div key={`export-${r.request_id}`} className={styles.requestRow}>
                        <span>
                          #{i + 1} • {new Date(r.requested_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  {requests.exportRequests.length > 5 && (
                    <button
                      className={styles.toggleButton}
                      onClick={() => setShowAllExports(!showAllExports)}
                    >
                      {showAllExports
                        ? `▲ Show less`
                        : `▼ Show all (${requests.exportRequests.length})`}
                    </button>
                  )}
                </>
              )}
            </div>

            <div style={{ marginTop: '0.75rem' }}>
              <strong>Account Deletion</strong>
              {requests.deletionRequests.length === 0 && <div className={styles.muted}>(none)</div>}
              {requests.deletionRequests.length > 0 && (
                <>
                  {requests.deletionRequests
                    .slice()
                    .reverse()
                    .slice(0, showAllExports ? undefined : 5)
                    .map((r, i) => (
                      <div key={`del-${r.request_id}`} className={styles.requestRow}>
                        <span>
                          #{i + 1} • {r.status} • {new Date(r.requested_at).toLocaleString()}
                        </span>
                        {r.status === 'PENDING' && (
                          <div className={styles.requestActions}>
                            <button
                              className={styles.dangerButton}
                              onClick={() => approveDeletion(r.request_id)}
                              disabled={isLoading}
                            >
                              Approve & Delete
                            </button>
                            <button
                              className={styles.secondaryButton}
                              onClick={() => cancelDeletion(r.request_id)}
                              disabled={isLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  {requests.deletionRequests.length > 5 && (
                    <button
                      className={styles.toggleButton}
                      onClick={() => setShowAllExports(!showAllExports)}
                    >
                      {showAllExports
                        ? `▲ Show less`
                        : `▼ Show all (${requests.deletionRequests.length})`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <div className={styles.optionActions}>
            <button
              className={styles.secondaryButton}
              onClick={refreshRequests}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.optionCard}>
          <div className={styles.optionContent}>
            <h3 className={styles.optionTitle}>🗑️ Delete My Account</h3>
            <p className={styles.optionDescription}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <div className={styles.optionActions}>
            <button
              className={styles.dangerButton}
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isLoading}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Account Permanently"
        message="This action cannot be undone. All your data will be permanently deleted. Please provide a reason for deletion (optional)."
        confirmText="Delete Account"
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsDeleteDialogOpen(false)}
        isDangerous
      />
    </div>
  );
};
