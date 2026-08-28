// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostedAccountMenu } from '../../src/auth/HostedAccountMenu';
import { HostedAuthProvider, useHostedAuth } from '../../src/auth/HostedAuthContext';
import { HostedAuthForm } from '../../src/auth/HostedAuthGate';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ada@example.com',
    app_metadata: {},
    user_metadata: { display_name: 'Ada' },
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as User;
}

function fakeSession(user: User | null): Session | null {
  return user
    ? {
        access_token: 'test-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 2_000_000_000,
        refresh_token: 'test-refresh-token',
        user,
      }
    : null;
}

function createFakeSupabase(session: Session | null, profileName = 'Ada') {
  const unsubscribe = vi.fn();
  const profileUpdate = vi.fn();
  const profileUpdateEq = vi.fn(async () => ({ error: null }));
  const updateUser = vi.fn(async () => ({
    data: { user: session?.user ?? fakeUser() },
    error: null,
  }));
  const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
  const signOut = vi.fn(async () => ({ error: null }));
  const profileQuery = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: profileName ? { display_name: profileName } : null,
          error: null,
        })),
      })),
    })),
    update: profileUpdate.mockImplementation(() => ({ eq: profileUpdateEq })),
  };
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
      resetPasswordForEmail,
      signOut,
      signInWithPassword: vi.fn(async () => ({ data: { session }, error: null })),
      signUp: vi.fn(async () => ({ data: { session }, error: null })),
      updateUser,
    },
    from: vi.fn(() => profileQuery),
  } as unknown as SupabaseClient;
  return {
    client,
    profileUpdate,
    resetPasswordForEmail,
    signOut,
    updateUser,
  };
}

function AuthProbe({ onReady }: { onReady: (auth: ReturnType<typeof useHostedAuth>) => void }) {
  const auth = useHostedAuth();
  onReady(auth);
  return <span data-testid="auth-state">{auth.displayName ?? 'none'}</span>;
}

describe('hosted Supabase account flow', () => {
  it('hydrates the profile and persists display-name changes', async () => {
    const user = fakeUser();
    const fake = createFakeSupabase(fakeSession(user));
    let latestAuth: ReturnType<typeof useHostedAuth> | null = null;

    render(
      <HostedAuthProvider enabled supabase={fake.client}>
        <AuthProbe onReady={(auth) => { latestAuth = auth; }} />
      </HostedAuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('Ada'));
    const auth = latestAuth as unknown as ReturnType<typeof useHostedAuth>;
    expect(auth.user?.id).toBe('user-1');

    await act(async () => {
      await auth.updateProfile('Ada Lovelace');
    });

    expect(fake.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ display_name: 'Ada Lovelace' }));
    expect(fake.updateUser).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ display_name: 'Ada Lovelace' }),
    }));
  });

  it('sends password reset requests from the sign-in screen', async () => {
    const fake = createFakeSupabase(null);
    render(
      <HostedAuthProvider enabled supabase={fake.client}>
        <HostedAuthForm />
      </HostedAuthProvider>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(fake.resetPasswordForEmail).toHaveBeenCalledWith(
      'ada@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('reset=1') }),
    ));
    expect(await screen.findByRole('status')).toHaveTextContent('password reset link');
  });

  it('opens the main-style account menu and profile editor', async () => {
    const user = fakeUser({ user_metadata: {} });
    const fake = createFakeSupabase(fakeSession(user), '');
    render(
      <HostedAuthProvider enabled supabase={fake.client}>
        <HostedAccountMenu />
      </HostedAuthProvider>,
    );

    const trigger = await screen.findByTestId('hosted-account-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(screen.getByTestId('hosted-account-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('hosted-account-profile'));

    const nameInput = await screen.findByLabelText('Display name');
    fireEvent.change(nameInput, { target: { value: 'Grace Hopper' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fake.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      display_name: 'Grace Hopper',
    })));
  });
});
