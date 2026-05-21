"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInStaffWithGoogle } from '../../lib/staffAuth';

// Theme colors
const COLORS = {
  background: '#fff',
  card: '#f7fafd',
  border: '#e3e8f0',
  text: '#171717',
  blue: '#1a73e8',
  darkBlue: '#174ea6',
  error: '#ff6b6b',
  inputBg: '#f1f5fa',
  inputBorder: '#cfd8e3',
  inputText: '#171717',
};

export default function StaffLoginPage() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Show error if redirected from Google callback
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'not_staff') {
        setError('Only authorized staff can log in with Google.');
      } else if (params.get('error')) {
        setError('Google sign-in failed.');
      }
    }
  }, []);

  // Placeholder for Google sign-in
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const result = await signInStaffWithGoogle();
    setLoading(false);
    if (!result.success) {
      setError(result.message || 'Google sign-in failed');
    }
    // On success, Supabase will redirect automatically
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe: false }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText || 'Login failed');
      } else {
        router.push('/business/staff-dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(23, 23, 23, 0.85)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
    }}>
      <div style={{
        background: COLORS.card,
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(26,115,232,0.10)',
        padding: '2.5rem 2rem 2rem 2rem',
        minWidth: 350,
        maxWidth: '90vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: COLORS.text,
        border: `1.5px solid ${COLORS.border}`,
        position: 'relative',
      }}>
        <img src="/logo.png" alt="MenuQR Logo" style={{ width: 56, height: 56, marginBottom: 16, borderRadius: 12, boxShadow: '0 2px 8px #1a73e822', objectFit: 'contain', aspectRatio: '1 / 1' }} />
        <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 26, letterSpacing: 0.5, color: COLORS.darkBlue }}>Staff Login</h2>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 8,
              border: `1.5px solid ${COLORS.inputBorder}`,
              background: COLORS.inputBg,
              color: COLORS.inputText,
              fontSize: 16,
              marginBottom: 4,
              outline: 'none',
              boxShadow: '0 1px 2px #1a73e811',
            }}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 8,
              border: `1.5px solid ${COLORS.inputBorder}`,
              background: COLORS.inputBg,
              color: COLORS.inputText,
              fontSize: 16,
              marginBottom: 4,
              outline: 'none',
              boxShadow: '0 1px 2px #1a73e811',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: COLORS.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0.85rem 1rem',
              fontWeight: 600,
              fontSize: 16,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 8,
              marginBottom: 8,
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s',
              boxShadow: '0 2px 8px #1a73e822',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          {error && <div style={{ color: COLORS.error, marginTop: 4, textAlign: 'center', fontWeight: 500 }}>{error}</div>}
        </form>
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            background: '#fff',
            color: COLORS.darkBlue,
            border: `1.5px solid ${COLORS.inputBorder}`,
            borderRadius: 8,
            padding: '0.85rem 1rem',
            fontWeight: 600,
            fontSize: 16,
            marginTop: 10,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 2px 8px #1a73e811',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <img src="/google.svg" alt="Google" style={{ width: 22, height: 22, marginRight: 6, objectFit: 'contain' }} />
          Sign in with Google
        </button>
        <div style={{ color: COLORS.error, fontSize: 14, marginTop: 10, textAlign: 'center', fontWeight: 500 }}>
          Staff only: Only authorized staff can log in to this page.
        </div>
      </div>
    </div>
  );
}
