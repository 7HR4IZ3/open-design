// Phase 5 / spec §15.6 — daemon metadata backend selection.
//
// Spec §15.6 calls out a Postgres adapter so multi-replica daemons
// can share state behind a load balancer. The daemon still uses local
// SQLite for its synchronous data-access surface. Hosted single-instance
// deployments may select the explicit `supabase-snapshot` bridge, which
// stores consistent SQLite backups in Supabase Storage while the relational
// Postgres adapter is migrated incrementally.
//
// `OD_DAEMON_DB=postgres` remains reserved for the future relational adapter.
// The server rejects it rather than silently dropping writes onto SQLite.

export type DaemonDbKind = 'sqlite' | 'postgres' | 'supabase-snapshot';

export interface DaemonDbConfig {
  kind: DaemonDbKind;
  // Resolution metadata the future Postgres adapter will read.
  postgres?: {
    host:     string;
    port:     number;
    database: string;
    user:     string;
    // Password / connection string are looked up at runtime from the
    // matching secret manager; we never read them through env at this
    // layer.
    sslMode?: 'disable' | 'require' | 'verify-full';
  };
  supabase?: {
    url: string;
    bucket: string;
    prefix: string;
    restore: 'if-missing' | 'always';
  };
}

export class DaemonDbConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DaemonDbConfigError';
  }
}

export function resolveDaemonDbConfig(env?: Record<string, string | undefined>): DaemonDbConfig {
  const e = env ?? process.env;
  const kind = (e.OD_DAEMON_DB ?? 'sqlite').trim().toLowerCase();
  if (kind === 'postgres') {
    const host = e.OD_PG_HOST ?? '';
    const portStr = e.OD_PG_PORT ?? '5432';
    const database = e.OD_PG_DATABASE ?? '';
    const user = e.OD_PG_USER ?? '';
    const sslMode = e.OD_PG_SSL_MODE === 'disable' || e.OD_PG_SSL_MODE === 'verify-full'
      ? e.OD_PG_SSL_MODE
      : 'require';
    if (!host || !database || !user) {
      throw new DaemonDbConfigError(
        'OD_DAEMON_DB=postgres requires OD_PG_HOST, OD_PG_DATABASE, OD_PG_USER. ' +
        'OD_PG_PORT defaults to 5432; OD_PG_SSL_MODE defaults to "require".',
      );
    }
    return {
      kind: 'postgres',
      postgres: {
        host,
        port:     Number.parseInt(portStr, 10) || 5432,
        database,
        user,
        sslMode,
      },
    };
  }
  if (kind === 'supabase-snapshot') {
    const url = e.SUPABASE_URL?.trim() ?? '';
    const serviceRoleKey = (
      e.SUPABASE_SERVICE_ROLE_KEY?.trim()
      || e.SUPABASE_SECRET_KEY?.trim()
      || ''
    );
    if (!url || !serviceRoleKey) {
      throw new DaemonDbConfigError(
        'OD_DAEMON_DB=supabase-snapshot requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    const restore = (e.OD_DAEMON_DB_RESTORE ?? 'if-missing').trim().toLowerCase();
    if (restore !== 'if-missing' && restore !== 'always') {
      throw new DaemonDbConfigError(
        `unknown OD_DAEMON_DB_RESTORE value '${restore}'. Accepted: 'if-missing' (default), 'always'.`,
      );
    }
    return {
      kind: 'supabase-snapshot',
      supabase: {
        url,
        bucket: (e.SUPABASE_DATABASE_BUCKET ?? 'open-design-database').trim(),
        prefix: (e.SUPABASE_DATABASE_PREFIX ?? 'daemon').trim(),
        restore,
      },
    };
  }
  if (kind !== 'sqlite' && kind !== '') {
    throw new DaemonDbConfigError(
      `unknown OD_DAEMON_DB value '${kind}'. Accepted: 'sqlite' (default), 'supabase-snapshot', 'postgres'.`,
    );
  }
  return { kind: 'sqlite' };
}
