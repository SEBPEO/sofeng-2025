import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthToken } from '@/store/auth/authApi';
import styles from './Dashboard.module.css';
import { Button } from '@/components';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    clearAuthToken();
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <div className={styles.subtitle}>
            Welcome back — here's a quick overview of your workspace.
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <section className={styles.statsGrid} aria-label="Key metrics">
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.label}>Active users</div>
          </div>
          <div className={styles.value}>1,248</div>
          <div className={styles.smallMuted}>Last 30 days</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.label}>Projects</div>
          </div>
          <div className={styles.value}>42</div>
          <div className={styles.smallMuted}>Active</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.label}>Revenue</div>
          </div>
          <div className={styles.value}>$12.5k</div>
          <div className={styles.smallMuted}>This month</div>
        </div>
      </section>
    </div>
  );
};
