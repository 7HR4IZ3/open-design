'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  hostedAuthRequired,
  installHostedAuthFetch,
  supabaseBrowserClient,
} from './supabase-browser';
import styles from './HostedAuthGate.module.css';

type AuthMode = 'sign-in' | 'sign-up';

function AuthForm({ supabase }: { supabase: SupabaseClient }) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const result = mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (result.error) {
        setError(result.error.message);
      } else if (mode === 'sign-up' && !result.data.session) {
        setMessage('Account created. Check your email to confirm your account, then sign in.');
        setMode('sign-in');
      } else {
        setMessage('Signed in.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to reach Supabase Auth.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="hosted-auth-title">
        <div className={styles.brandMark} aria-hidden="true">OD</div>
        <p className={styles.eyebrow}>OpenDesign Cloud</p>
        <h1 id="hosted-auth-title">{mode === 'sign-in' ? 'Sign in to OpenDesign' : 'Create your account'}</h1>
        <p className={styles.subtitle}>Your projects and agent workspaces are securely persisted to your account.</p>
        <form className={styles.form} onSubmit={submit}>
          <label>
            Email
            <input
              autoComplete="email"
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              disabled={busy}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <button className={styles.primaryButton} disabled={busy} type="submit">
            {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          className={styles.secondaryButton}
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setError(null);
            setMessage(null);
          }}
          type="button"
        >
          {mode === 'sign-in' ? 'Create a new account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}

function HostedAuthSetupError() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="hosted-auth-config-title">
        <p className={styles.eyebrow}>OpenDesign Cloud</p>
        <h1 id="hosted-auth-config-title">Authentication is not configured</h1>
        <p className={styles.subtitle}>
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the web build.
        </p>
      </section>
    </main>
  );
}

function HostedSignOutButton({ supabase }: { supabase: SupabaseClient }) {
  return (
    <button
      className={styles.signOut}
      onClick={() => { void supabase.auth.signOut(); }}
      type="button"
    >
      Sign out
    </button>
  );
}

export function HostedAuthGate({ children }: { children: ReactNode }) {
  const required = hostedAuthRequired();
  const supabase = required ? supabaseBrowserClient() : null;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(required);

  useEffect(() => {
    if (!required || !supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    const cleanupFetch = installHostedAuthFetch();
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      cleanupFetch();
      data.subscription.unsubscribe();
    };
  }, [required, supabase]);

  if (!required) return <>{children}</>;
  if (!supabase) return <HostedAuthSetupError />;
  if (loading) {
    return <main className={styles.page}><p className={styles.loading}>Checking your session…</p></main>;
  }
  if (!session) return <AuthForm supabase={supabase} />;
  return (
    <>
      <HostedSignOutButton supabase={supabase} />
      {children}
    </>
  );
}
