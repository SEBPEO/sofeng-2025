import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '@/api/auth';
import styles from './OAuthCallback.module.css';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setAuthToken(token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <div className={styles.container}>
      <h1>Signing you in…</h1>
    </div>
  );
};
