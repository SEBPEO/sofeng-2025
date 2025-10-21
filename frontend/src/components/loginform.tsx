import React, { useState } from 'react';
import { loginUser } from '../api/auth';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginUser(email, password);
      localStorage.setItem('token', res.token);
      window.location.href = '/dashboard';
    } catch {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <p className="error-text">{error}</p>}

      <div>
        <label>Email</label>
        <input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Password</label>
        <input
          type="password"
          placeholder=""
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="login-btn">
        Sign in
      </button>
    </form>
  );
};

export default LoginForm;
