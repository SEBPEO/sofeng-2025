import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { login, patients, legal, profile } from '@/features';
import { Layout } from '@/components';
import { getAuthToken } from '@/store/auth/authApi';

const Protected = ({ children }: { children: React.ReactNode }) => {
  const token = getAuthToken();
  return token ? <>{children}</> : <Navigate to="/" replace />;
};

// redirect to patients if already authenticated
const Root = () => {
  const token = getAuthToken();
  return !token ? <login.pages.Login /> : <Navigate to="/patients" replace />;
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
      { path: '/patients', element: <patients.pages.Patients /> },
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
