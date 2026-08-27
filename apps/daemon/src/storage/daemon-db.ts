// Hosted metadata backend selection.
//
// The daemon's existing repository surface is synchronous because a large
// part of the product talks directly to better-sqlite3. In hosted mode that
// surface is backed by an in-memory SQLite compatibility cache whose logical
// rows are persisted in Supabase Postgres (see supabase-postgres.ts). The
// cache is deliberately not an app.sqlite file and is rebuilt on every boot.

export type DaemonDbKind = 'sqlite' | 'postgres' | 'supabase-snapshot';

export interface SupabaseDaemonDbConfig {
  url: string;
  table: string;
  stateTable: string;
  flushIntervalMs: number;
}

export interface SupabaseSnapshotDbConfig {
  url: string;
  bucket: string;
  prefix: string;
  restore: 'if-missing' | 'always';
}

export interface DaemonDbConfig {
  kind: DaemonDbKind;
  // Legacy direct-Postgres configuration is retained for compatibility with
  // existing local configuration, but the server intentionally does not
  // enable it until a supported connection adapter is provided.
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
  supabase?: SupabaseDaemonDbConfig | SupabaseSnapshotDbConfig;
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
    const supabaseUrl = e.SUPABASE_URL?.trim() ?? '';
    const supabaseServiceKey = (
      e.SUPABASE_SERVICE_ROLE_KEY?.trim()
      || e.SUPABASE_SECRET_KEY?.trim()
      || ''
    );
    if (supabaseUrl || supabaseServiceKey) {
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new DaemonDbConfigError(
          'OD_DAEMON_DB=postgres requires both SUPABASE_URL and ' +
          'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).',
        );
      }
      const flushIntervalMs = Number.parseInt(e.SUPABASE_DB_FLUSH_INTERVAL_MS ?? '', 10);
      return {
        kind: 'postgres',
        supabase: {
          url: supabaseUrl,
          table: (e.SUPABASE_DB_TABLE ?? 'daemon_table_rows').trim() || 'daemon_table_rows',
          stateTable: (e.SUPABASE_DB_STATE_TABLE ?? 'daemon_database_state').trim() || 'daemon_database_state',
          flushIntervalMs: Number.isFinite(flushIntervalMs) && flushIntervalMs > 0
            ? Math.max(1_000, Math.min(flushIntervalMs, 300_000))
            : 15_000,
        },
      };
    }
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
      `unknown OD_DAEMON_DB value '${kind}'. Accepted: 'sqlite' (default), 'postgres'.`,
    );
  }
  return { kind: 'sqlite' };
}
