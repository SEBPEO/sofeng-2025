import styles from './Login.module.css';
import { GoogleIcon } from '@/components/icons';
import { Button } from '@/components';

function Login() {
  const redirectToGoogleAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`;
  };

  return (
    <div className={styles.app}>
      <div className={styles.brandHeader}>
        <h2>Medical AI Notetaker</h2>
      </div>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <h1>Welcome!</h1>
          <p>Continue with your Google account</p>
        </div>
        <Button className={styles.googleBtn} onClick={redirectToGoogleAuth}>
          <GoogleIcon /> Sign in with Google
        </Button>
      </div>
      <div className={styles.footer}>© 2025 Medical AI Notetaker. All rights reserved.</div>
    </div>
  );
}

export default Login;
