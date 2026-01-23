import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { Logo } from '@/components/icons/Logo';
import { MedicalBackground } from '@/components/MedicalBackground/MedicalBackground';
import { clearAuthToken } from '@/store/auth/authApi';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    clearAuthToken();
    navigate('/', { replace: true });
  };

  const goToPatients = () => navigate('/patients');
  const goToProfile = () => navigate('/profile');

  

  return (
    <div className={styles.app}>
      <aside className={`${styles.sidebar} `}>
        <div className={styles.brand}>
          <Logo />
          <span className={styles.brandText}>DocNotes</span>
        </div>

        <nav className={styles.nav}>
          <button className={styles.navItem} onClick={goToPatients} aria-label="Patients">
            <span className={styles.navIcon}>👥</span>
            <span className={styles.navLabel}>Patients</span>
          </button>

          <button className={styles.navItem} onClick={goToProfile} aria-label="Profile">
            <span className={styles.navIcon}>⚙️</span>
            <span className={styles.navLabel}>Profile</span>
          </button>

          <button className={styles.navItem} aria-label="Legal">
            <span className={styles.navIcon}>📄</span>
            <span className={styles.navLabel}>Legal</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.logout} onClick={handleLogout}>Logout</button>
        </div>

        
      </aside>

      
      <main className={styles.main}>
        <MedicalBackground variant="light" />

        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <div>
                <h2 className={styles.name}>Galileo Galilei</h2>
                <div className={styles.meta}>
                  <div>Total Sessions: <strong>0</strong></div>
                  <div>Last Session:</div>
                </div>
              </div>

              <button className={styles.arrow} aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          <button className={styles.addPatient} onClick={goToPatients}>
            <span className={styles.plus}>+</span> new patient
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
