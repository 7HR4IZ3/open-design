'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { HostedAccountMenu } from './HostedAccountMenu';
import {
  HostedAuthProviderForCurrentEnvironment,
  useHostedAuth,
} from './HostedAuthContext';
import styles from './HostedAuthGate.module.css';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

export function HostedAuthForm() {
  const { requestPasswordReset, supabase } = useHostedAuth();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';
  const isForgotPassword = mode === 'forgot-password';

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setPassword('');
    setShowPassword(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      if (isForgotPassword) {
        await requestPasswordReset(email);
        setMessage('If an account exists for that email, we sent a password reset link.');
        return;
      }

      const result = isSignUp
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { display_name: displayName.trim() || null },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error) {
        setError(result.error.message);
      } else if (isSignUp && !result.data.session) {
        setMode('sign-in');
        setPassword('');
        setShowPassword(false);
        setMessage('Account created. Check your email to confirm your account, then sign in.');
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
        <h1 id="hosted-auth-title">
          {isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Sign in to OpenDesign'}
        </h1>
        <p className={styles.subtitle}>
          {isForgotPassword
            ? 'We’ll email you a secure link to choose a new password.'
            : 'Your projects and agent workspaces are securely persisted to your account.'}
        </p>
        <form className={styles.form} onSubmit={submit}>
          {isSignUp ? (
            <label>
              Display name <span className={styles.optional}>Optional</span>
              <input
                autoComplete="name"
                disabled={busy}
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How should we call you?"
                type="text"
                value={displayName}
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              autoComplete="email"
              disabled={busy}
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          {!isForgotPassword ? (
            <label>
              Password
              <span className={styles.passwordField}>
                <input
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  disabled={busy}
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={busy}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </span>
              {isSignUp ? <span className={styles.fieldHint}>Use at least 6 characters.</span> : null}
            </label>
          ) : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <button className={styles.primaryButton} disabled={busy} type="submit">
            {busy
              ? 'Please wait…'
              : isForgotPassword
                ? 'Send reset link'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
          </button>
        </form>
        {!isSignUp && !isForgotPassword ? (
          <button
            className={styles.inlineLink}
            onClick={() => switchMode('forgot-password')}
            type="button"
          >
            Forgot password?
          </button>
        ) : null}
        <div className={styles.authFooter}>
          {isForgotPassword ? (
            <button className={styles.secondaryButton} onClick={() => switchMode('sign-in')} type="button">
              Back to sign in
            </button>
          ) : (
            <button
              className={styles.secondaryButton}
              onClick={() => switchMode(isSignUp ? 'sign-in' : 'sign-up')}
              type="button"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Create a new account'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function PasswordRecoveryForm() {
  const { finishPasswordRecovery, updatePassword } = useHostedAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Your new password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      setMessage('Password updated. You can continue to OpenDesign.');
      setPassword('');
      setConfirmation('');
      window.setTimeout(finishPasswordRecovery, 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="hosted-recovery-title">
        <div className={styles.brandMark} aria-hidden="true">OD</div>
        <p className={styles.eyebrow}>OpenDesign Cloud</p>
        <h1 id="hosted-recovery-title">Choose a new password</h1>
        <p className={styles.subtitle}>Your reset link is active. Choose a password you’ll remember.</p>
        <form className={styles.form} onSubmit={submit}>
          <label>
            New password
            <input
              autoComplete="new-password"
              disabled={busy}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label>
            Confirm new password
            <input
              autoComplete="new-password"
              disabled={busy}
              minLength={6}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <button className={styles.primaryButton} disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  );
}

function HostedAuthSetupError() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="hosted-auth-config-title">
        <div className={styles.brandMark} aria-hidden="true">OD</div>
        <p className={styles.eyebrow}>OpenDesign Cloud</p>
        <h1 id="hosted-auth-config-title">Authentication is not configured</h1>
        <p className={styles.subtitle}>
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for the web build.
        </p>
      </section>
    </main>
  );
}

function HostedAuthContent({ children }: { children: ReactNode }) {
  const auth = useHostedAuth();
  if (!auth.enabled) return <>{children}</>;
  if (!auth.supabase) return <HostedAuthSetupError />;
  if (auth.loading) {
    return <main className={styles.page}><p className={styles.loading}>Checking your session…</p></main>;
  }
  if (!auth.session) return <HostedAuthForm />;
  if (auth.passwordRecovery) return <PasswordRecoveryForm />;
  return (
    <>
      <HostedAccountMenu />
      {children}
    </>
  );
}

export function HostedAuthGate({ children }: { children: ReactNode }) {
  return (
    <HostedAuthProviderForCurrentEnvironment>
      <HostedAuthContent>{children}</HostedAuthContent>
    </HostedAuthProviderForCurrentEnvironment>
  );
}
