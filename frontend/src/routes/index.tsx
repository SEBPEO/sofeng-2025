import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { login, dashboard, profile } from '@/features';
import { getAuthToken } from '@/store/auth/authApi';

const Protected = ({ children }: { children: React.ReactNode }) => {
  const token = getAuthToken();
  return token ? <>{children}</> : <Navigate to="/" replace />;
};

// redirect to dashboard if already authenticated
const Root = () => {
  const token = getAuthToken();
  return !token ? <login.pages.Login /> : <Navigate to="/dashboard" replace />;
};

const router = createBrowserRouter([
  { path: '/', element: <Root /> },
  {
    path: '/dashboard',
    element: (
      <Protected>
        <dashboard.pages.Dashboard />
      </Protected>
    ),
  },
  {
    path: '/profile',
    element: (
      <Protected>
        <profile.pages.Profile.Profile />
      </Protected>
    ),
  },
  { path: '/oauth/callback', element: <login.pages.OAuthCallback /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
