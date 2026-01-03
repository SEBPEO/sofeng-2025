import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { login, appointments, legal, profile } from '@/features';
import { Layout } from '@/components';
import { getAuthToken } from '@/store/auth/authApi';

const Protected = ({ children }: { children: React.ReactNode }) => {
  const token = getAuthToken();
  return token ? <>{children}</> : <Navigate to="/" replace />;
};

// redirect to appointments if already authenticated
const Root = () => {
  const token = getAuthToken();
  return !token ? <login.pages.Login /> : <Navigate to="/appointments" replace />;
};

const router = createBrowserRouter([
  { path: '/', element: <Root /> },
  {
    element: (
      <Protected>
        <Layout />
      </Protected>
    ),
    children: [
      { path: '/appointments', element: <appointments.pages.Appointments.Appointments /> },
      { path: '/profile', element: <profile.pages.Profile.Profile /> },
      { path: '/legal', element: <legal.pages.Legal /> },
    ],
  },
  { path: '/oauth/callback', element: <login.pages.OAuthCallback /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
