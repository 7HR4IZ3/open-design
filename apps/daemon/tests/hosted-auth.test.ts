import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  createHostedAuthMiddleware,
  createHostedAuthVerifier,
  hostedAuthPrincipalFromRequest,
  resolveHostedAuthConfig,
} from '../src/hosted-auth.js';

function request(init: { path?: string; authorization?: string; method?: string } = {}): Request {
  return {
    method: init.method ?? 'GET',
    path: init.path ?? '/projects',
    get(name: string) {
      return name.toLowerCase() === 'authorization' ? init.authorization : undefined;
    },
  } as unknown as Request;
}

function response() {
  const result: {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
    setHeader: (name: string, value: string) => void;
    status: (status: number) => typeof result;
    json: (body: unknown) => typeof result;
  } = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      result.headers[name] = value;
    },
    status(status) {
      result.statusCode = status;
      return result;
    },
    json(body) {
      result.body = body;
      return result;
    },
  };
  return result as unknown as Response & typeof result;
}

describe('hosted Supabase auth', () => {
  it('stays disabled unless explicitly enabled', () => {
    expect(resolveHostedAuthConfig({})).toBeNull();
    expect(resolveHostedAuthConfig({
      OD_HOSTED_AUTH_REQUIRED: 'false',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'secret',
    })).toBeNull();
  });

  it('requires both daemon Supabase secrets when enabled', () => {
    expect(() => resolveHostedAuthConfig({ OD_HOSTED_AUTH_REQUIRED: '1' })).toThrow(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
    expect(resolveHostedAuthConfig({
      OD_HOSTED_AUTH_REQUIRED: '1',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'secret',
    })).toEqual({
      url: 'https://example.supabase.co',
      serviceRoleKey: 'secret',
    });
  });

  it('turns a verified Supabase user into a request principal', async () => {
    const verifier = createHostedAuthVerifier(
      { url: 'https://example.supabase.co', serviceRoleKey: 'secret' },
      {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-1', email: 'user@example.com' } },
            error: null,
          }),
        },
      } as never,
    );
    const middleware = createHostedAuthMiddleware({ verifier });
    const req = request({ authorization: 'Bearer token-1' });
    const res = response();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(hostedAuthPrincipalFromRequest(req)).toEqual({
      kind: 'supabase',
      userId: 'user-1',
      email: 'user@example.com',
    });
  });

  it('rejects missing and invalid tokens', async () => {
    const verifier = { verifyAccessToken: vi.fn().mockResolvedValue(null) };
    const middleware = createHostedAuthMiddleware({ verifier });

    const missingResponse = response();
    await middleware(request(), missingResponse, vi.fn());
    expect(missingResponse.statusCode).toBe(401);

    const invalidResponse = response();
    await middleware(request({ authorization: 'Bearer expired' }), invalidResponse, vi.fn());
    expect(invalidResponse.statusCode).toBe(401);
  });

  it('leaves health probes and delegated routes to their own gates', async () => {
    const verifier = { verifyAccessToken: vi.fn() };
    const middleware = createHostedAuthMiddleware({
      verifier,
      allowUnauthenticated: (req) => req.path.startsWith('/tools/'),
    });
    const healthNext = vi.fn();
    await middleware(request({ path: '/health' }), response(), healthNext);
    expect(healthNext).toHaveBeenCalledOnce();
    const toolNext = vi.fn();
    await middleware(request({ path: '/tools/bash' }), response(), toolNext);
    expect(toolNext).toHaveBeenCalledOnce();
    expect(verifier.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('reports verifier outages as retryable service failures', async () => {
    const middleware = createHostedAuthMiddleware({
      verifier: { verifyAccessToken: vi.fn().mockRejectedValue(new Error('network')) },
    });
    const res = response();
    await middleware(request({ authorization: 'Bearer token' }), res, vi.fn());
    expect(res.statusCode).toBe(503);
  });
});
