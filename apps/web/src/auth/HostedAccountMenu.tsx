'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../components/Icon';
import { SignOutConfirmDialog } from '../components/SignOutConfirmDialog';
import { useHostedAuth } from './HostedAuthContext';
import styles from './HostedAuthGate.module.css';

export const HOSTED_OPEN_SETTINGS_EVENT = 'opendesign:open-settings';

const REPO_URL = 'https://github.com/nexu-io/open-design';
const GITHUB_HELP_URL = `${REPO_URL}/issues/new`;
const GITHUB_FEATURE_URL = `${REPO_URL}/pulls`;
const externalLinkProps = { target: '_blank', rel: 'noreferrer noopener' } as const;

function accountInitial(displayName: string): string {
  return displayName.trim().charAt(0).toUpperCase() || 'O';
}

function HostedProfileDialog({ onClose }: { onClose: () => void }) {
  const {
    displayName: savedDisplayName,
    updateEmail,
    updatePassword,
    updateProfile,
    user,
  } = useHostedAuth();
  const [displayName, setDisplayName] = useState(savedDisplayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const nextEmail = email.trim();
      if (!nextEmail) throw new Error('Enter an email address.');
      if (password && password !== passwordConfirmation) {
        throw new Error('The new passwords do not match.');
      }
      if (password && password.length < 6) {
        throw new Error('Your new password must be at least 6 characters.');
      }

      const currentEmail = user?.email?.trim() ?? '';
      const currentName = savedDisplayName?.trim() ?? '';
      const nextName = displayName.trim();
      const changedEmail = nextEmail.toLowerCase() !== currentEmail.toLowerCase();
      const changedName = nextName !== currentName;
      const changedPassword = Boolean(password);

      if (!changedEmail && !changedName && !changedPassword) {
        setMessage('Your profile is already up to date.');
        return;
      }

      if (changedName) await updateProfile(nextName);
      if (changedEmail) await updateEmail(nextEmail);
      if (changedPassword) await updatePassword(password);

      setPassword('');
      setPasswordConfirmation('');
      setMessage(
        changedEmail
          ? 'Profile saved. Check your new email address to confirm the change.'
          : 'Profile saved.',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your profile.');
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className={styles.dialogBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hosted-profile-title"
      >
        <header className={styles.dialogHeader}>
          <div>
            <p className={styles.dialogEyebrow}>Account</p>
            <h2 id="hosted-profile-title">Profile settings</h2>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            disabled={busy}
            aria-label="Close profile settings"
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <form className={styles.profileForm} onSubmit={submit}>
          <div className={styles.profileSection}>
            <div className={styles.profileSectionHeading}>
              <strong>Personal details</strong>
              <span>Shown in your OpenDesign account menu.</span>
            </div>
            <label>
              Display name
              <input
                autoComplete="name"
                disabled={busy}
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                type="text"
                value={displayName}
              />
            </label>
            <label>
              Email address
              <input
                autoComplete="email"
                disabled={busy}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
              <span className={styles.fieldHint}>Changing email may require confirmation from both addresses.</span>
            </label>
          </div>
          <div className={styles.profileSection}>
            <div className={styles.profileSectionHeading}>
              <strong>Change password</strong>
              <span>Leave these fields empty to keep your current password.</span>
            </div>
            <label>
              New password
              <input
                autoComplete="new-password"
                disabled={busy}
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
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
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                type="password"
                value={passwordConfirmation}
              />
            </label>
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

export function HostedAccountMenu() {
  const {
    displayName: contextDisplayName,
    signOut,
    user,
  } = useHostedAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const accountContainerRef = useRef<HTMLDivElement | null>(null);
  const accountName = contextDisplayName || user?.email?.split('@')[0] || 'OpenDesign user';
  const initial = accountInitial(accountName);
  const email = user?.email?.trim() || null;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!accountContainerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user || typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div className={`entry-top-right-cluster ${styles.accountCluster}`}>
          <div className="entry-top-right-account-pill hosted-account-pill">
            <div
              ref={accountContainerRef}
              className="entry-nav-rail__account entry-nav-rail__account--floating"
            >
              <button
                type="button"
                className="entry-nav-rail__account-trigger"
                onClick={() => {
                  setMenuError(null);
                  setOpen((current) => !current);
                }}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`${accountName} account menu`}
                data-testid="hosted-account-trigger"
              >
                <span className="entry-nav-rail__account-avatar" aria-hidden>{initial}</span>
              </button>
              {open ? (
                <div className="entry-nav-rail__account-menu" role="menu" data-testid="hosted-account-menu">
                  <div className="entry-nav-rail__account-head">
                    <span className="entry-nav-rail__account-head-avatar" aria-hidden>{initial}</span>
                    <span className="entry-nav-rail__account-head-name">{accountName}</span>
                    {email ? <span className="entry-nav-rail__account-head-email">{email}</span> : null}
                  </div>
                  <button
                    type="button"
                    className="entry-nav-rail__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      setProfileOpen(true);
                    }}
                    data-testid="hosted-account-profile"
                  >
                    <Icon name="edit" size={15} /> Profile
                  </button>
                  <button
                    type="button"
                    className="entry-nav-rail__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      window.dispatchEvent(new Event(HOSTED_OPEN_SETTINGS_EVENT));
                    }}
                    data-testid="hosted-account-settings"
                  >
                    <Icon name="settings" size={15} /> Settings
                  </button>
                  <a
                    className="entry-nav-rail__menu-item"
                    role="menuitem"
                    href={GITHUB_HELP_URL}
                    {...externalLinkProps}
                    onClick={() => setOpen(false)}
                  >
                    <Icon name="comment" size={15} /> GitHub help
                  </a>
                  <a
                    className="entry-nav-rail__menu-item"
                    role="menuitem"
                    href={GITHUB_FEATURE_URL}
                    {...externalLinkProps}
                    onClick={() => setOpen(false)}
                  >
                    <Icon name="sparkles" size={15} /> Feature request
                  </a>
                  <div className="entry-nav-rail__menu-divider" />
                  <button
                    type="button"
                    className="entry-nav-rail__menu-item"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      setConfirmSignOut(true);
                    }}
                    data-testid="hosted-account-sign-out"
                  >
                    <Icon name="log-out" size={15} /> Sign out
                  </button>
                  {menuError ? <p className={styles.menuError} role="alert">{menuError}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      )}
      {profileOpen ? <HostedProfileDialog onClose={() => setProfileOpen(false)} /> : null}
      {confirmSignOut ? (
        <SignOutConfirmDialog
          busy={signOutBusy}
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={() => {
            setSignOutBusy(true);
            void signOut().then(({ error }) => {
              if (error) {
                setMenuError(error.message);
                setOpen(true);
              }
              setSignOutBusy(false);
              setConfirmSignOut(false);
            });
          }}
        />
      ) : null}
    </>
  );
}
