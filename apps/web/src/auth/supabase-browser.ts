'use client';

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

function isTruthy(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function hostedAuthRequired(): boolean {
  return isTruthy(process.env.NEXT_PUBLIC_OD_HOSTED_AUTH_REQUIRED);
}

export function supabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    || ''
  );
  if (!url || !key) {
    client = null;
    return client;
  }
  client = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

function sameOriginApiRequest(input: RequestInfo | URL): boolean {
  if (typeof window === 'undefined') return false;
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  try {
    const url = new URL(raw, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

/**
 * Add the current Supabase access token to same-origin API requests. Existing
 * Authorization headers win so scoped tool tokens and local integrations keep
 * their established behavior.
 */
export function installHostedAuthFetch(): () => void {
  if (typeof window === 'undefined' || !hostedAuthRequired()) return () => {};
  const supabase = supabaseBrowserClient();
  if (!supabase) return () => {};
  const original = window.fetch;
  const wrapped: typeof window.fetch = async (input, init) => {
    if (!sameOriginApiRequest(input)) return original(input, init);

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    for (const [key, value] of new Headers(init?.headers ?? {}).entries()) {
      headers.set(key, value);
    }
    if (!headers.has('authorization')) {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return original(input, {
      ...(init ?? {}),
      headers,
      credentials: init?.credentials ?? 'same-origin',
    });
  };
  window.fetch = wrapped;
  return () => {
    if (window.fetch === wrapped) window.fetch = original;
  };
}

/**
 * EventSource cannot set request headers. The daemon accepts this short-lived
 * query token only for its known SSE routes. Keep this helper local to those
 * call sites so ordinary API URLs never gain credentials in their query.
 */
export function createHostedEventSource(path: string): EventSource | Promise<EventSource> {
  if (typeof window === 'undefined') throw new Error('EventSource requires a browser');
  const url = new URL(path, window.location.origin);
  const open = () => new EventSource(`${url.pathname}${url.search}`, { withCredentials: false });
  if (!hostedAuthRequired()) return open();
  const supabase = supabaseBrowserClient();
  if (!supabase) return open();
  return supabase.auth.getSession().then(({ data }) => {
    if (data.session?.access_token) {
      url.searchParams.set('access_token', data.session.access_token);
    }
    return open();
  });
}

export async function currentHostedSession(): Promise<Session | null> {
  const supabase = supabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}
