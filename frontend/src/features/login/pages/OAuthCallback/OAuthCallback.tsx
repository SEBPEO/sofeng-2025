import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '@/store/auth/authApi';
import styles from './OAuthCallback.module.css';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Prevent double navigation
    if (hasNavigated.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const profileCompleted = params.get('profileCompleted');

    if (token) {
      setAuthToken(token);
      hasNavigated.current = true;
      
      // Redirect to profile page if not completed, otherwise to dashboard
      if (profileCompleted === 'false') {
        navigate('/profile', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      hasNavigated.current = true;
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return (
    <div className={styles.container}>
      <h1>Signing you in…</h1>
    </div>
  );
};
