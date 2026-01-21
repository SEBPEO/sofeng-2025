import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import {
  login,
  appointments,
  legal,
  profile,
  patients,
  consultations,
  chat,
  notifications,
} from '@/features';
import { AuditLogs } from '@/features/audit';
import { Layout } from '@/components';
import { getAuthToken } from '@/store/auth/authApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { getUserByJwtThunk } from '@/store/user/userSlice';

const Protected = ({ children }: { children: React.ReactNode }) => {
  const token = getAuthToken();
  return token ? <>{children}</> : <Navigate to="/" replace />;
};

// redirect to appointments if already authenticated
const Root = () => {
  const token = getAuthToken();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.users.current);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (token && !currentUser) {
      dispatch(getUserByJwtThunk() as any).then(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [token, currentUser, dispatch]);

  if (!token) {
    return <login.pages.Login />;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Redirect based on role
  if (currentUser?.role === 'doctor') {
    return <Navigate to="/patients" replace />;
  } else if (currentUser?.role === 'patient') {
    return <Navigate to="/my-doctor" replace />;
  } else {
    // If role is not set, redirect to profile to complete setup
    return <Navigate to="/profile" replace />;
  }
};

// Role-aware route wrappers
const MyPatientsRoute = () => {
  const currentUser = useAppSelector((s) => s.users.current);
  if (currentUser?.role === 'patient') return <Navigate to="/my-doctor" replace />;
  return <patients.pages.MyPatients />;
};

const MyDoctorRoute = () => {
  const currentUser = useAppSelector((s) => s.users.current);
  if (currentUser?.role === 'doctor') return <Navigate to="/patients" replace />;
  return <patients.pages.MyDoctor />;
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
      {
        path: '/consultations/:appointmentId',
        element: <consultations.pages.ConsultationSession />,
      },
      { path: '/patients', element: <MyPatientsRoute /> },
      { path: '/available-patients', element: <patients.pages.AllPatients /> },
      { path: '/my-doctor', element: <MyDoctorRoute /> },
      { path: '/doctor-notes', element: <patients.pages.DoctorNotes /> },
      { path: '/messages', element: <chat.pages.Messages /> },
      { path: '/shared-notes', element: <consultations.pages.SharedNotes /> },
      { path: '/profile', element: <profile.pages.Profile.Profile /> },
      { path: '/notifications', element: <notifications.NotificationSettings /> },
      { path: '/audit-logs', element: <AuditLogs /> },
      { path: '/legal', element: <legal.pages.Legal /> },
    ],
  },
  { path: '/oauth/callback', element: <login.pages.OAuthCallback /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
