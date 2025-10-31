import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';
import Login from './features/Login/pages/Login/Login';

import Dashboard from './features/Dashboard/pages/Dashboard/Dashboard';
import { getAuthToken } from './api/auth';
import OAuthCallback from './features/Login/components/OAuthCallback/OAuthCallback';

const Protected = ({ children }: { children: React.ReactNode }) => {
  const token = getAuthToken();
  return token ? <>{children}</> : <Navigate to="/" replace />;
};

//redirect to dashboard if already authenticated
const Root = () => {
  const token = getAuthToken();
  return token ? <Navigate to="/dashboard" replace /> : <Login />;
};

const router = createBrowserRouter([
  { path: '/', element: <Root /> },
  {
    path: '/dashboard',
    element: (
      <Protected>
        <Dashboard />
      </Protected>
    ),
  },
  { path: '/oauth/callback', element: <OAuthCallback /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
