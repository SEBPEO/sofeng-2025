import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Logo } from '@/components/icons';
import { MedicalBackground } from '@/components/MedicalBackground';
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

  // Load user data on mount
  useEffect(() => {
    dispatch(getUserByJwtThunk() as any);
  }, [dispatch]);

  const handleLogout = () => {
    clearAuthToken();
    navigate('/', { replace: true });
  };

  // Different menu items for doctors vs patients
  const getDoctorNavItems = () => [
    { path: '/appointments', icon: '📅', label: 'Appointments' },
    { path: '/patients', icon: '❤️', label: 'My Patients' },
    { path: '/available-patients', icon: '👥', label: 'Available Patients' },
    { path: '/profile', icon: '⚙️', label: 'Profile' },
    { path: '/legal', icon: '📄', label: 'Legal' },
  ];

  const getPatientNavItems = () => [
    { path: '/appointments', icon: '📅', label: 'Appointments' },
    { path: '/my-doctor', icon: '👨‍⚕️', label: 'My Doctor' },
    { path: '/profile', icon: '⚙️', label: 'Profile' },
    { path: '/legal', icon: '📄', label: 'Legal' },
  ];

  const navItems = userRole === 'doctor' ? getDoctorNavItems() : getPatientNavItems();

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
