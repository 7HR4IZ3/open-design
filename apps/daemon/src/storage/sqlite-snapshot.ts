// Hosted SQLite durability bridge.
//
// The daemon's metadata API is intentionally synchronous today because a
// large part of the server talks directly to better-sqlite3. Replacing that
// surface with an async Postgres repository is a separate migration. This
// module gives hosted, single-instance deployments a safe transition path:
// better-sqlite3's backup API creates a consistent database image, and the
// image is stored as one private Supabase Storage object.

import type Database from 'better-sqlite3';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { promises as fsp, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { StorageError } from './project-storage.js';

const SQLITE_HEADER = Buffer.from('SQLite format 3\0', 'ascii');
const DEFAULT_FLUSH_INTERVAL_MS = 15_000;
const DEFAULT_DEBOUNCE_MS = 250;
const MIN_FLUSH_INTERVAL_MS = 1_000;
const MAX_FLUSH_INTERVAL_MS = 300_000;

export interface SqliteSnapshotStore {
  readSnapshot(): Promise<Buffer | null>;
  writeSnapshot(body: Buffer): Promise<void>;
}

export interface SupabaseSqliteSnapshotStoreOptions {
  client: SupabaseClient;
  bucket: string;
  /** Namespace inside the bucket; defaults to `daemon`. */
  prefix?: string;
}

/**
 * Stores the daemon metadata database as a private Supabase Storage object.
 * This is deliberately not presented as a multi-replica database: the
 * snapshot bridge assumes one active daemon writer for a deployment.
 */
export class SupabaseSqliteSnapshotStore implements SqliteSnapshotStore {
  constructor(public readonly options: SupabaseSqliteSnapshotStoreOptions) {
    if (!options.client) throw new StorageError('IO', 'SupabaseSqliteSnapshotStore requires a client');
    if (!options.bucket) throw new StorageError('IO', 'SupabaseSqliteSnapshotStore requires a bucket');
    validatePrefix(options.prefix ?? 'daemon');
  }

  async readSnapshot(): Promise<Buffer | null> {
    const { data, error } = await this.options.client.storage
      .from(this.options.bucket)
      .download(this.objectKey());
    if (error) {
      if (isNotFound(error)) return null;
      throw new StorageError('IO', `Supabase database snapshot download failed: ${error.message}`);
    }
    if (!data) throw new StorageError('IO', 'Supabase database snapshot returned no data');
    const body = Buffer.from(await data.arrayBuffer());
    assertSqliteSnapshot(body);
    return body;
  }

  async writeSnapshot(body: Buffer): Promise<void> {
    assertSqliteSnapshot(body);
    const { error } = await this.options.client.storage
      .from(this.options.bucket)
      .upload(this.objectKey(), body, {
        upsert: true,
        cacheControl: 'no-cache',
        contentType: 'application/vnd.sqlite3',
      });
    if (error) {
      throw new StorageError('IO', `Supabase database snapshot upload failed: ${error.message}`);
    }
  }

  objectKey(): string {
    return `${normalizePrefix(this.options.prefix ?? 'daemon')}/app.sqlite`;
  }
}

export interface RestoreSqliteSnapshotOptions {
  targetFile: string;
  store: SqliteSnapshotStore;
  mode?: 'if-missing' | 'always';
}

export interface RestoreSqliteSnapshotResult {
  restored: boolean;
  reason: 'missing' | 'local-present' | 'no-snapshot' | 'restored';
  /** A recoverable local path when `always` preserved an existing database. */
  localBackupFile?: string;
}

/**
 * Restore a remote snapshot before `openDatabase()` opens the SQLite file.
 * `if-missing` is the safe default for local development. Hosted operators
 * can use `always` when the remote object is the deliberate source of truth;
 * an existing local database is renamed rather than deleted.
 */
export async function restoreSqliteSnapshot(
  options: RestoreSqliteSnapshotOptions,
): Promise<RestoreSqliteSnapshotResult> {
  const mode = options.mode ?? 'if-missing';
  const snapshot = await options.store.readSnapshot();
  if (!snapshot) return { restored: false, reason: 'no-snapshot' };
  assertSqliteSnapshot(snapshot);

  const artifacts = await existingDatabaseArtifacts(options.targetFile);
  const hasUsableLocal = artifacts.some((file) => file === options.targetFile && fileSize(file) > SQLITE_HEADER.length);
  if (mode === 'if-missing' && hasUsableLocal) {
    return { restored: false, reason: 'local-present' };
  }

  const targetDir = path.dirname(options.targetFile);
  await fsp.mkdir(targetDir, { recursive: true });
  const tempFile = path.join(
    targetDir,
    `.app.sqlite.restore-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  await fsp.writeFile(tempFile, snapshot, { mode: 0o600 });

  let localBackupFile: string | undefined;
  try {
    if (artifacts.length > 0) {
      const backupBase = `${options.targetFile}.local-${Date.now()}`;
      for (const artifact of artifacts) {
        const suffix = artifact.slice(options.targetFile.length);
        const destination = `${backupBase}${suffix}`;
        await fsp.rename(artifact, destination);
        if (artifact === options.targetFile) localBackupFile = destination;
      }
    }
    await fsp.rename(tempFile, options.targetFile);
  } catch (error) {
    await safeUnlink(tempFile);
    throw new StorageError('IO', `could not restore SQLite database snapshot: ${errorMessage(error)}`);
  }
  return {
    restored: true,
    reason: 'restored',
    ...(localBackupFile ? { localBackupFile } : {}),
  };
}

export interface SqliteSnapshotPersistenceOptions {
  db: Pick<Database.Database, 'backup'>;
  store: SqliteSnapshotStore;
  flushIntervalMs?: number;
  debounceMs?: number;
  logger?: Pick<Console, 'warn' | 'error'>;
}

/**
 * Coordinates consistent backups, mutation-triggered flushes, and a periodic
 * safety flush for background writes. A failed post-start flush is retained
 * as dirty and logged; the next flush retries it rather than claiming that
 * ephemeral disk is durable.
 */
export class SqliteSnapshotPersistence {
  private readonly flushIntervalMs: number;
  private readonly debounceMs: number;
  private readonly logger: Pick<Console, 'warn' | 'error'>;
  private interval: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private rerun = false;
  private dirty = true;
  private disposed = false;
  private _lastSuccessfulAt: number | null = null;
  private _lastError: string | null = null;

  constructor(private readonly options: SqliteSnapshotPersistenceOptions) {
    this.flushIntervalMs = boundedInterval(options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS);
    this.debounceMs = Math.max(0, Math.min(options.debounceMs ?? DEFAULT_DEBOUNCE_MS, this.flushIntervalMs));
    this.logger = options.logger ?? console;
  }

  get lastSuccessfulAt(): number | null { return this._lastSuccessfulAt; }
  get lastError(): string | null { return this._lastError; }

  start(): void {
    if (this.disposed || this.interval) return;
    this.interval = setInterval(() => {
      void this.flushNow({ force: true }).catch((error) => {
        this.logger.warn('[db-snapshot] periodic flush failed', error);
      });
    }, this.flushIntervalMs);
    this.interval.unref?.();
  }

  markDirty(): void {
    if (this.disposed) return;
    this.dirty = true;
    if (this.inFlight) this.rerun = true;
    if (this.debounceTimer) return;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushNow().catch((error) => {
        this.logger.warn('[db-snapshot] mutation flush failed', error);
      });
    }, this.debounceMs);
    this.debounceTimer.unref?.();
  }

  async flushNow({ force = false }: { force?: boolean } = {}): Promise<void> {
    if (this.inFlight) {
      if (force || this.dirty) this.rerun = true;
      return this.inFlight;
    }
    if (!force && !this.dirty) return;

    this.inFlight = (async () => {
      do {
        this.rerun = false;
        if (!force && !this.dirty) break;
        this.dirty = false;
        try {
          await this.writeConsistentBackup();
          this._lastSuccessfulAt = Date.now();
          this._lastError = null;
        } catch (error) {
          this.dirty = true;
          this._lastError = errorMessage(error);
          throw error;
        }
        force = false;
      } while (this.rerun);
    })().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  async shutdown(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    await this.flushNow({ force: true });
  }

  private async writeConsistentBackup(): Promise<void> {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'open-design-db-snapshot-'));
    const backupFile = path.join(tempDir, 'app.sqlite');
    try {
      await this.options.db.backup(backupFile);
      const body = await fsp.readFile(backupFile);
      assertSqliteSnapshot(body);
      await this.options.store.writeSnapshot(body);
    } finally {
      await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export function createSupabaseSqliteSnapshotStore(env: Record<string, string | undefined> = process.env): SupabaseSqliteSnapshotStore {
  const url = env.SUPABASE_URL?.trim() ?? '';
  const serviceRoleKey = (
    env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || env.SUPABASE_SECRET_KEY?.trim()
    || ''
  );
  if (!url || !serviceRoleKey) {
    throw new StorageError(
      'IO',
      'OD_DAEMON_DB=supabase-snapshot requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  return new SupabaseSqliteSnapshotStore({
    client: createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }),
    bucket: (env.SUPABASE_DATABASE_BUCKET ?? 'open-design-database').trim(),
    prefix: (env.SUPABASE_DATABASE_PREFIX ?? 'daemon').trim(),
  });
}

function assertSqliteSnapshot(body: Buffer): void {
  if (body.length <= SQLITE_HEADER.length || !body.subarray(0, SQLITE_HEADER.length).equals(SQLITE_HEADER)) {
    throw new StorageError('IO', 'SQLite database snapshot is invalid');
  }
}

function validatePrefix(prefix: string): void {
  const normalized = normalizePrefix(prefix);
  if (!normalized || normalized.split('/').some((part) => part === '.' || part === '..')) {
    throw new StorageError('TRAVERSAL', `unsafe database snapshot prefix ${prefix}`);
  }
}

function normalizePrefix(prefix: string): string {
  return String(prefix || '').replace(/^[\/]+|[\/]+$/g, '').replace(/[\\]+/g, '/').replace(/\/+/g, '/');
}

function isNotFound(error: { status?: number | undefined; message?: string | undefined }): boolean {
  return error.status === 404 || /not found|does not exist|no such/i.test(error.message ?? '');
}

async function existingDatabaseArtifacts(targetFile: string): Promise<string[]> {
  const candidates = [targetFile, `${targetFile}-wal`, `${targetFile}-shm`];
  const found: string[] = [];
  for (const candidate of candidates) {
    try {
      const stat = await fsp.stat(candidate);
      if (stat.isFile()) found.push(candidate);
    } catch {
      // Missing SQLite sidecars are normal.
    }
  }
  return found;
}

function fileSize(file: string): number {
  try {
    // This helper is only used after `existingDatabaseArtifacts`, and the
    // synchronous stat keeps the restore decision atomic with the subsequent
    // rename sequence.
    return statSync(file).size;
  } catch {
    return 0;
  }
}

async function safeUnlink(file: string): Promise<void> {
  await fsp.rm(file, { force: true }).catch(() => undefined);
}

function boundedInterval(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FLUSH_INTERVAL_MS;
  return Math.max(MIN_FLUSH_INTERVAL_MS, Math.min(MAX_FLUSH_INTERVAL_MS, Math.round(value)));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
