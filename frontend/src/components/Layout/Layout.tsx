import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '@/components/icons';
import { MedicalBackground } from '@/components/MedicalBackground';
import { clearAuthToken } from '@/store/auth/authApi';
import styles from './Layout.module.css';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAuthToken();
    navigate('/', { replace: true });
  };

  const navItems = [
    { path: '/appointments', icon: '📅', label: 'Appointments' },
    { path: '/patients', icon: '👥', label: 'Patients' },
    { path: '/profile', icon: '⚙️', label: 'Profile' },
    { path: '/legal', icon: '📄', label: 'Legal' },
  ];

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Logo />
          <span className={styles.brandText}>DocNotes</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.logout} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <MedicalBackground variant="light" />
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
