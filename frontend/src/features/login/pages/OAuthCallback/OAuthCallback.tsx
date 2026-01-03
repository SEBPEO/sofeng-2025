import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthToken } from '@/store/auth/authApi';
import { useAppDispatch } from '@/store/hooks';
import { getUserByJwtThunk } from '@/store/user/userSlice';
import styles from './OAuthCallback.module.css';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const hasNavigated = useRef(false);
  const dispatch = useAppDispatch();

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
      // Load user data to determine role
      dispatch(getUserByJwtThunk() as any).then((action: any) => {
        const user = action.payload;

        if (profileCompleted === 'false') {
          navigate('/profile', { replace: true });
        } else if (user?.role === 'doctor') {
          navigate('/patients', { replace: true });
        } else if (user?.role === 'patient') {
          navigate('/my-doctor', { replace: true });
        } else {
          navigate('/profile', { replace: true });
        }
      });
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
