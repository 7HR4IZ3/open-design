'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AuthError,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import {
  hostedAuthRequired,
  installHostedAuthFetch,
  supabaseBrowserClient,
} from './supabase-browser';

export interface HostedProfile {
  displayName: string | null;
}

export interface HostedAuthContextValue {
  enabled: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  supabase: SupabaseClient | null;
  profile: HostedProfile;
  profileLoading: boolean;
  passwordRecovery: boolean;
  displayName: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  finishPasswordRecovery: () => void;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const disabledAuthContext: HostedAuthContextValue = {
  enabled: false,
  loading: false,
  session: null,
  user: null,
  supabase: null,
  profile: { displayName: null },
  profileLoading: false,
  passwordRecovery: false,
  displayName: null,
  refreshProfile: async () => {},
  updateProfile: async () => {},
  updateEmail: async () => {},
  updatePassword: async () => {},
  requestPasswordReset: async () => {},
  finishPasswordRecovery: () => {},
  signOut: async () => ({ error: null }),
};

const HostedAuthContext = createContext<HostedAuthContextValue>(disabledAuthContext);

function metadataDisplayName(user: User | null): string | null {
  if (!user) return null;
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const value = metadata?.display_name ?? metadata?.full_name ?? metadata?.name;
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim();
}

function recoveryLinkIsActive(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hash.includes('type=recovery')
    || new URLSearchParams(window.location.search).get('reset') === '1';
}

interface HostedAuthProviderProps {
  children: ReactNode;
  enabled: boolean;
  supabase: SupabaseClient | null;
}

export function HostedAuthProvider({
  children,
  enabled,
  supabase,
}: HostedAuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(enabled && Boolean(supabase));
  const [profile, setProfile] = useState<HostedProfile>({ displayName: null });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(recoveryLinkIsActive);

  const user = session?.user ?? null;

  const readProfile = useCallback(async (profileUser: User): Promise<string | null> => {
    if (!supabase) return null;
    try {
      const result = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', profileUser.id)
        .maybeSingle();
      if (result.error) return null;
      const row = result.data as { display_name?: unknown } | null;
      return typeof row?.display_name === 'string' && row.display_name.trim()
        ? row.display_name.trim()
        : null;
    } catch {
      // The auth session should remain usable if a deployed database has not
      // received the profile migration yet. Metadata remains a safe fallback.
      return null;
    }
  }, [supabase]);

  const loadProfileForUser = useCallback(async (profileUser: User) => {
    setProfileLoading(true);
    const storedName = await readProfile(profileUser);
    setProfile({ displayName: storedName ?? metadataDisplayName(profileUser) });
    setProfileLoading(false);
  }, [readProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile({ displayName: null });
      return;
    }
    await loadProfileForUser(user);
  }, [loadProfileForUser, user]);

  useEffect(() => {
    if (!enabled || !supabase) {
      setLoading(false);
      setSession(null);
      setProfile({ displayName: null });
      setProfileLoading(false);
      return undefined;
    }

    let active = true;
    const cleanupFetch = installHostedAuthFetch();

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) {
        // Do not await database work inside Supabase's auth callback. The
        // client can otherwise wait on its own lock while refreshing tokens.
        window.setTimeout(() => {
          if (active) void loadProfileForUser(nextSession.user);
        }, 0);
      } else {
        setProfile({ displayName: null });
        setProfileLoading(false);
      }
    };

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
      applySession(nextSession);
      setLoading(false);
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!active) return;
      applySession(sessionData.session ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      cleanupFetch();
      data.subscription.unsubscribe();
    };
  }, [enabled, loadProfileForUser, supabase]);

  const updateProfile = useCallback(async (displayName: string) => {
    if (!supabase || !user) throw new Error('You must be signed in to update your profile.');
    const normalizedName = displayName.trim() || null;
    const profileResult = await supabase
      .from('profiles')
      .update({
        display_name: normalizedName,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    if (profileResult.error) throw profileResult.error;

    const metadata = { ...user.user_metadata, display_name: normalizedName };
    const authResult = await supabase.auth.updateUser({ data: metadata });
    if (authResult.error) throw authResult.error;
    setProfile({ displayName: normalizedName });
  }, [supabase, user]);

  const updateEmail = useCallback(async (email: string) => {
    if (!supabase || !user) throw new Error('You must be signed in to update your email.');
    const result = await supabase.auth.updateUser({ email: email.trim() });
    if (result.error) throw result.error;
  }, [supabase, user]);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase || !user) throw new Error('You must be signed in to update your password.');
    const result = await supabase.auth.updateUser({ password });
    if (result.error) throw result.error;
  }, [supabase, user]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Authentication is not configured.');
    if (typeof window === 'undefined') throw new Error('Password recovery requires a browser.');
    const redirectUrl = new URL(window.location.pathname, window.location.origin);
    redirectUrl.searchParams.set('reset', '1');
    const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl.toString(),
    });
    if (result.error) throw result.error;
  }, [supabase]);

  const finishPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('reset');
    url.hash = '';
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return { error: null };
    return supabase.auth.signOut();
  }, [supabase]);

  const value = useMemo<HostedAuthContextValue>(() => ({
    enabled,
    loading,
    session,
    user,
    supabase,
    profile,
    profileLoading,
    passwordRecovery,
    displayName: profile.displayName ?? metadataDisplayName(user),
    refreshProfile,
    updateProfile,
    updateEmail,
    updatePassword,
    requestPasswordReset,
    finishPasswordRecovery,
    signOut,
  }), [
    enabled,
    finishPasswordRecovery,
    loading,
    passwordRecovery,
    profile,
    profileLoading,
    refreshProfile,
    requestPasswordReset,
    session,
    signOut,
    supabase,
    updateEmail,
    updatePassword,
    updateProfile,
    user,
  ]);

  return <HostedAuthContext.Provider value={value}>{children}</HostedAuthContext.Provider>;
}

export function useHostedAuth(): HostedAuthContextValue {
  return useContext(HostedAuthContext);
}

export function HostedAuthProviderForCurrentEnvironment({ children }: { children: ReactNode }) {
  const enabled = hostedAuthRequired();
  const supabase = enabled ? supabaseBrowserClient() : null;
  return (
    <HostedAuthProvider enabled={enabled} supabase={supabase}>
      {children}
    </HostedAuthProvider>
  );
}
