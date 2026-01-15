import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '@/components/icons';
import { MedicalBackground } from '@/components/MedicalBackground';
import { NotificationBell } from '@/features/notifications';
import { clearAuthToken } from '@/store/auth/authApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { getUserByJwtThunk } from '@/store/user/userSlice';
import styles from './Layout.module.css';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.users.current);
  const userRole = currentUser?.role;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load user data on mount
  useEffect(() => {
    dispatch(getUserByJwtThunk() as any);
  }, [dispatch]);

  const handleLogout = () => {
    clearAuthToken();
    setIsSidebarOpen(false);
    navigate('/', { replace: true });
  };

  // Different menu items for doctors vs patients
  const getDoctorNavItems = () => [
    { path: '/appointments', icon: '📅', label: 'Appointments' },
    { path: '/patients', icon: '❤️', label: 'My Patients' },
    { path: '/available-patients', icon: '👥', label: 'Available Patients' },
    { path: '/messages', icon: '💬', label: 'Messages' },
    { path: '/profile', icon: '⚙️', label: 'Profile' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/legal', icon: '📄', label: 'Legal' },
  ];

  const getPatientNavItems = () => [
    { path: '/appointments', icon: '📅', label: 'Appointments' },
    { path: '/my-doctor', icon: '👨‍⚕️', label: 'My Doctor' },
    { path: '/messages', icon: '💬', label: 'Messages' },
    { path: '/profile', icon: '⚙️', label: 'Profile' },
    { path: '/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/legal', icon: '📄', label: 'Legal' },
  ];

  const navItems = userRole === 'doctor' ? getDoctorNavItems() : getPatientNavItems();

  return (
    <div className={styles.app}>
      {/* Mobile header */}
      <header className={styles.mobileHeader}>
        <button
          className={styles.menuButton}
          aria-label="Open menu"
          onClick={() => setIsSidebarOpen(true)}
        >
          ☰
        </button>
        <div className={styles.mobileBrand}>
          <Logo />
        <div className={styles.mobileActions}>
          <NotificationBell />
        </div>
          <span className={styles.brandText}>DocNotes</span>
        </div>
      </header>

      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <Logo />
          <span className={styles.brandText}>DocNotes</span>
          <div className={styles.desktopBellWrapper}>
            <NotificationBell />
          </div>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              onClick={() => {
                navigate(item.path);
                setIsSidebarOpen(false);
              }}
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

      {/* Backdrop for mobile drawer */}
      <div
        className={`${styles.backdrop} ${isSidebarOpen ? styles.backdropVisible : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <main className={styles.main}>
        <MedicalBackground variant="light" />
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
