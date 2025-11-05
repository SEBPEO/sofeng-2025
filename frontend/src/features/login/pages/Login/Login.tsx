import styles from './Login.module.css';
import { GoogleIcon, Logo } from '@/components/icons';
import { Button } from '@/components';

export function Login() {
  const redirectToGoogleAuth = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`;
  };

  return (
    <div className={styles.app}>
      {/* Sunset elements */}
      <div className={styles.sun}>
        <div className={styles.sunRay1}></div>
        <div className={styles.sunRay2}></div>
        <div className={styles.sunRay3}></div>
        <div className={styles.sunRay4}></div>
      </div>
      <div className={styles.cloud1}></div>
      <div className={styles.cloud2}></div>
      <div className={styles.cloud3}></div>
      
      {/* Medical crosses decorations */}
      <div className={styles.medicalCross1}></div>
      <div className={styles.medicalCross2}></div>
      <div className={styles.medicalCross3}></div>
      
      {/* City skyline buildings */}
      <div className={styles.building1}></div>
      <div className={styles.building2}></div>
      
      <div className={styles.brandHeader}>
        <Logo size={40} className={styles.logo} />
        <div className={styles.brandText}>
          <h2>Medical AI Notetaker</h2>
          <span className={styles.tagline}>Intelligent Healthcare Documentation</span>
        </div>
        <div className={styles.sparkle1}></div>
        <div className={styles.sparkle2}></div>
        <div className={styles.sparkle3}></div>
      </div>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <h1>Welcome to Your Medical Assistant</h1>
          <p>Streamline patient care with AI-powered note-taking</p>
        </div>
        <Button className={styles.googleBtn} onClick={redirectToGoogleAuth}>
          <GoogleIcon /> Sign in with Google
        </Button>
      </div>
      <div className={styles.footer}>© 2025 Medical AI Notetaker. All rights reserved.</div>
    </div>
  );
}
