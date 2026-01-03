import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import './styles/variables.css';
import './index.css';
import AppRouter from './routes';
import store from '@/store';
import { devAutoLogin, getAuthToken } from '@/store/auth/authApi';

// ============================================================================
// TEMPORARY DEV MODE: Auto-login with kemplent user on app load
// TODO: RESTORE AUTH VALIDATION - Remove this auto-login and restore proper auth flow
// ============================================================================
// Auto-login if no token exists
if (!getAuthToken()) {
  devAutoLogin().catch((err) => {
    console.warn('[DEV MODE] Auto-login failed:', err);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AppRouter />
    </Provider>
  </StrictMode>,
);
