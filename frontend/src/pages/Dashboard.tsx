import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthToken } from '../api/auth';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    clearAuthToken();
    navigate('/', { replace: true });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>
      <p>You are logged in.</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Dashboard;
