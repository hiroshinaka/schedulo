import React, { useState } from 'react';
import API_BASE from '../utils/apiBase';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

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

      navigate('/');
    } catch (err) {
      console.error('Signup failed', err);
      setError('Signup failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/50 to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Create your account</CardTitle>
          <CardDescription className="text-center text-base">
            Join Schedulo and start organizing your schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium text-left">First name</Label>
                <Input
                  type="text"
                  id="first_name"
                  placeholder="John"
                  value={first_name}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium text-left">Last name</Label>
                <Input
                  type="text"
                  id="last_name"
                  placeholder="Doe"
                  value={last_name}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-left">Email address</Label>
              <Input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-left">Password</Label>
              <Input
                type="password"
                id="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
              <p className="text-xs text-muted-foreground">Must be at least 10 characters with one uppercase letter, one symbol, and one number.</p>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium">
              Create Account
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <a href="/login" className="text-primary font-medium hover:underline">Sign in</a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
