import React, { useState } from 'react';
import API_BASE from '../utils/apiBase';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name, last_name, email, password }),
      });

      const data = res.headers.get('content-type') && res.headers.get('content-type').includes('application/json')
        ? await res.json()
        : { ok: false };

      if (!res.ok || !data.ok) {
        setError(data.message || 'Signup failed');
        return;
      }

      // Try auto-login using the login endpoint (backend expects email/password)
      try {
        const loginRes = await fetch(`${API_BASE}/api/login`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const loginData = loginRes.headers.get('content-type') && loginRes.headers.get('content-type').includes('application/json')
          ? await loginRes.json()
          : { ok: false };

        if (loginRes.ok && loginData.ok) {
          navigate('/');
          return;
        }
      } catch (err) {
        console.error('Auto-login after signup failed', err);
      }

      // If auto-login failed, still navigate to home or login page as desired
      navigate('/');
    } catch (err) {
      console.error('Signup failed', err);
      setError('Signup failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">Sign Up</h2>
        {error && (
          <div className="text-sm text-red-600 mb-2">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">First name</span>
              <input
                type="text"
                className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                placeholder="First name"
                value={first_name}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Last name</span>
              <input
                type="text"
                className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
                placeholder="Last name"
                value={last_name}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input
              type="password"
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm sm:text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-md shadow-sm hover:bg-slate-700 transition-colors duration-200 ease-in-out"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}
