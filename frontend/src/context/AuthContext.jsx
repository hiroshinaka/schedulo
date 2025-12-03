import React, { createContext, useState, useEffect } from 'react';
import API_BASE from '../utils/apiBase';
import { initFirebaseClient, signInWithServerToken } from '../firebase/client';

// initialize firebase client if config provided via env
if (process.env.REACT_APP_FIREBASE_API_KEY) {
  try {
    initFirebaseClient({
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    });
  } catch (err) {
    console.warn('Firebase client init failed', err);
  }
}

export const AuthContext = createContext({
  user: null,
  loggedIn: false,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const loggedIn = Boolean(user);

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
      if (!res.ok) {
        setUser(null);
        return null;
      }
      const data = await res.json();
      if (data && data.ok && data.user) {
        setUser(data.user);
        // attempt firebase sign-in with custom token (non-blocking)
        (async () => {
          try {
            await signInWithServerToken();
          } catch (err) {
            // non-fatal: app still functions without firebase auth
            // console.debug('Firebase sign-in skipped or failed', err);
          }
        })();
        return data.user;
      }
      setUser(null);
      return null;
    } catch (err) {
      console.error('Auth refresh failed', err);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    // initial fetch of session
    (async () => {
      await refresh(); // this waits for the refresh to complete before loading the page
      setInitialized(true);
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log('[AuthContext.login] /api/login response:', res.status, data);
      if (data && data.ok) {
        // backend doesn't return the user object on login; refresh session to get user
        console.log('[AuthContext.login] Login successful, calling refresh...');
        const currentUser = await refresh();
        console.log('[AuthContext.login] refresh returned:', currentUser);
        if (currentUser) {
          return { ok: true, user: currentUser };
        }
        return { ok: true };
      }
      console.log('[AuthContext.login] Login failed:', data);
      return data || { ok: false };
    } catch (err) {
      console.error('Login failed', err);
      return { ok: false, message: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setUser(null);
      return data;
    } catch (err) {
      console.error('Logout failed', err);
      setUser(null);
      return { ok: false };
    }
  };

  if (!initialized) {
    return null; // can replace w/ loading component if we want 
  }

  return (
    <AuthContext.Provider value={{ user, loggedIn, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;