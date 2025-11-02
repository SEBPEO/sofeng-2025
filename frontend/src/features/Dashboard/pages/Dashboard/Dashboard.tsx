import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthToken } from '@/api/auth';
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
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.text}>You are logged in.</p>
      <Button className={styles.logoutButton} onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
};
