// Lightweight Firebase client initializer and helper to sign in with server-issued custom token.
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore as _getFirestore } from 'firebase/firestore';

let app = null;
let auth = null;
let firestore = null;

export function initFirebaseClient(config) {
  if (!app) {
    app = initializeApp(config);
    auth = getAuth(app);
    try {
      firestore = _getFirestore(app);
    } catch (err) {
      // optional: firestore may not be available if firebase packages missing
      console.warn('Firestore init skipped', err);
    }
  }
  return { app, auth, firestore };
}

// Fetches a custom token from your backend and signs in the firebase client.
export async function signInWithServerToken() {
  // backend endpoint returns { ok: true, token }
  const resp = await fetch('/api/firebase-token', { method: 'POST', credentials: 'include' });
  if (!resp.ok) throw new Error('Failed to fetch firebase token');
  const data = await resp.json();
  if (!data || !data.ok || !data.token) throw new Error('No firebase token returned');
  if (!auth) throw new Error('Firebase client not initialized');
  return signInWithCustomToken(auth, data.token);
}

export function getFirebaseAuth() { return auth; }
export function getFirestoreClient() { return firestore; }
