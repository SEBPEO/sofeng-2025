import { useState, useEffect } from 'react';
import { auditApi } from '../../api';
import type { AuditLog } from '../../api';
import styles from './AuditLogs.module.css';

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Filters
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadLogs();
  }, [resourceType, action, startDate, endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await auditApi.getAuditLogs({
        resourceType: resourceType || undefined,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 500,
      });
      setLogs(data);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes('LOGIN')) return styles.badgeAuth;
    if (action.includes('CREATE')) return styles.badgeCreate;
    if (action.includes('UPDATE') || action.includes('EDIT')) return styles.badgeUpdate;
    if (action.includes('DELETE') || action.includes('CANCEL')) return styles.badgeDelete;
    if (action.includes('DOWNLOAD') || action.includes('ACCESS')) return styles.badgeAccess;
    if (action.includes('MESSAGE')) return styles.badgeMessage;
    return styles.badgeDefault;
  };

  const parseDetails = (detailsJson: string | null) => {
    if (!detailsJson) return null;
    try {
      return JSON.parse(detailsJson);
    } catch {
      return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Audit Logs</h1>
        <p className={styles.subtitle}>
          Track all system activities, file access, and data modifications
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label>Resource Type</label>
          <select value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
            <option value="">All Resources</option>
            <option value="Appointment">Appointments</option>
            <option value="Consultation">Consultations</option>
            <option value="File">Files & Recordings</option>
            <option value="Chat">Messages</option>
            <option value="Auth">Authentication</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Action</label>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All Actions</option>
            <option value="LOGIN">Login</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="RECORDING_DOWNLOAD">Recording Download</option>
            <option value="RECORDING_UPLOAD">Recording Upload</option>
            <option value="CONSULTATION_VIEW">Consultation View</option>
            <option value="MESSAGE_SENT">Message Sent</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className={styles.filterGroup}>
          <label>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <button onClick={loadLogs} className={styles.refreshButton}>
          Refresh
        </button>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className={styles.resultsCount}>
          Showing {logs.length} log {logs.length !== 1 ? 'entries' : 'entry'}
        </div>
      )}

      {/* Loading State */}
      {loading && <div className={styles.loading}>Loading audit logs...</div>}

      {/* Error State */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Logs Table */}
      {!loading && !error && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    No audit logs found for the selected filters
                  </td>
                </tr>
              ) : (
                (showAll ? logs : logs.slice(0, 10)).map((log) => {
                  const details = parseDetails(log.details);
                  return (
                    <tr key={log.audit_id}>
                      <td className={styles.timestamp}>{formatDate(log.created_at)}</td>
                      <td className={styles.user}>
                        {log.user ? (
                          <div>
                            <div className={styles.userName}>
                              {log.user.first_name} {log.user.last_name}
                            </div>
                            <div className={styles.userRole}>{log.user.role}</div>
                          </div>
                        ) : (
                          <span className={styles.systemUser}>System</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${getActionBadgeClass(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div className={styles.resource}>
                          <div className={styles.resourceType}>{log.resource_type}</div>
                          {log.resource_id && (
                            <div className={styles.resourceId}>ID: {log.resource_id}</div>
                          )}
                        </div>
                      </td>
                      <td className={styles.details}>
                        {details ? (
                          <pre className={styles.detailsJson}>
                            {JSON.stringify(details, null, 2)}
                          </pre>
                        ) : (
                          <span className={styles.noDetails}>—</span>
                        )}
                      </td>
                      <td className={styles.ipAddress}>{log.ip_address || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Show More/Less Button */}
          {logs.length > 10 && (
            <div className={styles.showMoreContainer}>
              <button onClick={() => setShowAll(!showAll)} className={styles.showMoreButton}>
                {showAll ? 'Show Less' : `Show All (${logs.length} total)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
