import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { NextFunction, Request, Response } from 'express';
import { sendApiError } from './http/api-errors.js';

/** The identity attached to requests authenticated by Supabase Auth. */
export interface HostedAuthPrincipal {
  readonly kind: 'supabase';
  readonly userId: string;
  readonly email?: string;
}

export interface HostedAuthConfig {
  readonly url: string;
  readonly serviceRoleKey: string;
}

export interface HostedAuthVerifier {
  verifyAccessToken(token: string): Promise<HostedAuthPrincipal | null>;
}

export interface HostedAuthMiddlewareOptions {
  verifier: HostedAuthVerifier;
  /** Paths are relative to the `/api` mount. */
  openPaths?: ReadonlySet<string>;
  /** Used for preview scopes and explicitly delegated tool routes. */
  allowUnauthenticated?: (req: Request) => boolean;
  /**
   * EventSource cannot set Authorization headers. Query-string tokens are
   * accepted only for these exact, pre-declared SSE paths; ordinary API
   * requests never get a credential-bearing query fallback.
   */
  queryTokenPaths?: readonly RegExp[];
}

const DEFAULT_OPEN_PATHS = new Set([
  '/health',
  '/ready',
  '/version',
]);

function isTruthy(value: unknown): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

/**
 * Hosted auth is opt-in. Local desktop/dev runs remain headerless unless the
 * operator explicitly sets OD_HOSTED_AUTH_REQUIRED.
 */
export function isHostedAuthRequired(env: Record<string, string | undefined> = process.env): boolean {
  return isTruthy(env.OD_HOSTED_AUTH_REQUIRED);
}

/**
 * Resolve and validate the daemon-only Supabase configuration. Returning null
 * when the feature flag is absent is intentional: a local daemon must not
 * require a cloud account or network access just because Supabase variables
 * happen to exist in a developer's shell.
 */
export function resolveHostedAuthConfig(
  env: Record<string, string | undefined> = process.env,
): HostedAuthConfig | null {
  if (!isHostedAuthRequired(env)) return null;
  const url = env.SUPABASE_URL?.trim() ?? '';
  const serviceRoleKey = (
    env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || env.SUPABASE_SECRET_KEY?.trim()
    || ''
  );
  if (!url || !serviceRoleKey) {
    throw new Error(
      'OD_HOSTED_AUTH_REQUIRED is enabled, but SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not both set',
    );
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      throw new Error('Supabase URL must use https');
    }
  } catch (error) {
    throw new Error(`SUPABASE_URL is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { url, serviceRoleKey };
}

function principalFromUser(user: User): HostedAuthPrincipal {
  return {
    kind: 'supabase',
    userId: user.id,
    ...(typeof user.email === 'string' && user.email.length > 0 ? { email: user.email } : {}),
  };
}

export function createHostedAuthVerifier(
  config: HostedAuthConfig,
  client?: SupabaseClient,
): HostedAuthVerifier {
  const supabase = client ?? createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return {
    async verifyAccessToken(token: string): Promise<HostedAuthPrincipal | null> {
      const result = await supabase.auth.getUser(token);
      if (result.error || !result.data.user) return null;
      return principalFromUser(result.data.user);
    },
  };
}

export function bearerTokenFromHostedRequest(req: Request): string | null {
  const header = req.get('authorization');
  if (typeof header !== 'string') return null;
  const match = /^Bearer[\t ]+(\S+)[\t ]*$/i.exec(header.trim());
  return match?.[1] ?? null;
}

function queryTokenFromHostedRequest(
  req: Request,
  queryTokenPaths: readonly RegExp[],
): string | null {
  if (req.method !== 'GET' || !queryTokenPaths.some((pattern) => pattern.test(req.path))) {
    return null;
  }
  const value = req.query?.access_token;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function hostedAuthPrincipalFromRequest(
  req: Request,
): HostedAuthPrincipal | null {
  const principal = (req as Request & { hostedPrincipal?: HostedAuthPrincipal }).hostedPrincipal;
  return principal?.kind === 'supabase' && principal.userId ? principal : null;
}

export function createHostedAuthMiddleware({
  verifier,
  openPaths = DEFAULT_OPEN_PATHS,
  allowUnauthenticated,
  queryTokenPaths = [],
}: HostedAuthMiddlewareOptions) {
  return async function hostedAuthMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (req.method === 'OPTIONS' || openPaths.has(req.path) || allowUnauthenticated?.(req)) {
      next();
      return;
    }

    const token = bearerTokenFromHostedRequest(req)
      ?? queryTokenFromHostedRequest(req, queryTokenPaths);
    if (!token) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      sendApiError(res, 401, 'UNAUTHORIZED', 'Supabase sign-in is required');
      return;
    }

    try {
      const principal = await verifier.verifyAccessToken(token);
      if (!principal) {
        res.setHeader('WWW-Authenticate', 'Bearer');
        sendApiError(res, 401, 'UNAUTHORIZED', 'Supabase session is invalid or expired');
        return;
      }
      (req as Request & { hostedPrincipal?: HostedAuthPrincipal }).hostedPrincipal = principal;
      next();
    } catch (error) {
      console.error('[hosted-auth] token verification failed', error);
      sendApiError(
        res,
        503,
        'AGENT_UNAVAILABLE',
        'Supabase authentication is temporarily unavailable',
        { retryable: true },
      );
    }
  };
}
