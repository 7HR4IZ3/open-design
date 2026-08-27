// Hosted metadata persistence for the daemon.
//
// Most of the daemon's repository helpers intentionally remain synchronous
// because they are backed by better-sqlite3. Hosted mode keeps that API in an
// in-memory SQLite compatibility cache and mirrors its logical rows to
// Supabase Postgres. The cache is rebuilt on boot, so Render's ephemeral
// filesystem is never used as the source of truth and app.sqlite is never
// created in this mode.

import Database from 'better-sqlite3';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import type { SupabaseDaemonDbConfig } from './daemon-db.js';
import { StorageError } from './project-storage.js';

type SqliteDb = Database.Database;
type SqliteRow = Record<string, unknown>;

interface SqliteColumn {
  name: string;
  pk: number;
}

interface LogicalRow {
  table_name: string;
  row_key: string;
  row_data: Record<string, unknown>;
}

interface RemoteRow extends LogicalRow {
  updated_at?: string;
}

interface SupabaseQueryResult<T = unknown> {
  data: T | null;
  error: { message?: string; code?: string } | null;
}

export interface SupabasePostgresPersistenceOptions {
  db: SqliteDb;
  client: SupabaseClient;
  tableName?: string;
  stateTableName?: string;
  flushIntervalMs?: number;
  logger?: Pick<Console, 'warn' | 'error'>;
}

export interface SupabasePostgresRestoreResult {
  source: 'postgres' | 'legacy-sqlite' | 'empty';
  rowCount: number;
  legacyDatabaseFile?: string;
}

export interface SupabasePostgresPersistenceStatus {
  backend: 'supabase-postgres';
  persistent: true;
  lastSuccessfulAt: number | null;
  lastError: string | null;
  dirty: boolean;
}

const DEFAULT_FLUSH_INTERVAL_MS = 15_000;
const DEFAULT_DEBOUNCE_MS = 250;
const MAX_FLUSH_INTERVAL_MS = 300_000;
const PAGE_SIZE = 1_000;
const WRITE_CHUNK_SIZE = 250;
const SINGLETON_STATE_ID = 'singleton';

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value)) {
    throw new StorageError('IO', `unsafe SQLite identifier: ${value}`);
  }
  return `"${value}"`;
}

function boundedInterval(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) return DEFAULT_FLUSH_INTERVAL_MS;
  return Math.max(1_000, Math.min(Math.trunc(value), MAX_FLUSH_INTERVAL_MS));
}

function encodeSqliteValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return { __od_type: 'buffer', base64: value.toString('base64') };
  }
  if (typeof value === 'bigint') {
    return { __od_type: 'bigint', value: value.toString(10) };
  }
  if (value instanceof Uint8Array) {
    return { __od_type: 'buffer', base64: Buffer.from(value).toString('base64') };
  }
  return value;
}

function decodeSqliteValue(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (record.__od_type === 'buffer' && typeof record.base64 === 'string') {
    return Buffer.from(record.base64, 'base64');
  }
  if (record.__od_type === 'bigint' && typeof record.value === 'string') {
    return BigInt(record.value);
  }
  return value;
}

function encodedRowData(row: SqliteRow, columns: readonly SqliteColumn[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const column of columns) {
    result[column.name] = encodeSqliteValue(row[column.name]);
  }
  return result;
}

function rowKey(row: SqliteRow, columns: readonly SqliteColumn[], ordinal: number): string {
  const primaryKey = columns
    .filter((column) => column.pk > 0)
    .sort((left, right) => left.pk - right.pk);
  if (primaryKey.length > 0) {
    return JSON.stringify({
      kind: 'primary-key',
      values: primaryKey.map((column) => encodeSqliteValue(row[column.name])),
    });
  }
  if (Object.prototype.hasOwnProperty.call(row, '__od_rowid')) {
    return JSON.stringify({ kind: 'rowid', value: encodeSqliteValue(row.__od_rowid) });
  }
  // SQLite virtual tables without a rowid are not part of the daemon's
  // normal metadata schema, but a deterministic content key makes the
  // adapter safe if a future migration adds one.
  const digest = createHash('sha256')
    .update(JSON.stringify(encodedRowData(row, columns)))
    .digest('hex');
  return JSON.stringify({ kind: 'content', digest, ordinal });
}

function tableNames(db: SqliteDb, excludedTable?: string): string[] {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master
         WHERE type = 'table'
           AND name NOT LIKE 'sqlite_%'
           AND name <> ?
         ORDER BY name`,
    )
    .all(excludedTable ?? '') as Array<{ name?: unknown }>;
  return rows
    .map((item) => typeof item.name === 'string' ? item.name : '')
    .filter(Boolean);
}

function tableColumns(db: SqliteDb, table: string): SqliteColumn[] {
  return (db.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as Array<{ name?: unknown; pk?: unknown }>)
    .map((column) => ({
      name: typeof column.name === 'string' ? column.name : '',
      pk: Number(column.pk ?? 0),
    }))
    .filter((column) => column.name.length > 0);
}

function readSqliteRows(db: SqliteDb, table: string): LogicalRow[] {
  const columns = tableColumns(db, table);
  if (columns.length === 0) return [];
  const quotedTable = quoteIdentifier(table);
  let sourceRows: SqliteRow[];
  try {
    sourceRows = db.prepare(`SELECT rowid AS "__od_rowid", * FROM ${quotedTable}`).all() as SqliteRow[];
  } catch {
    sourceRows = db.prepare(`SELECT * FROM ${quotedTable}`).all() as SqliteRow[];
  }
  return sourceRows.map((sourceRow, ordinal) => ({
    table_name: table,
    row_key: rowKey(sourceRow, columns, ordinal),
    row_data: encodedRowData(sourceRow, columns),
  }));
}

function snapshotSqliteDatabase(db: SqliteDb, excludedTable?: string): LogicalRow[] {
  const result: LogicalRow[] = [];
  for (const table of tableNames(db, excludedTable)) {
    result.push(...readSqliteRows(db, table));
  }
  return result;
}

function normalizeRemoteRow(value: unknown): RemoteRow | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.table_name !== 'string' || typeof record.row_key !== 'string' || record.row_data == null) return null;
  let rowData: Record<string, unknown>;
  if (typeof record.row_data === 'string') {
    try {
      const parsed = JSON.parse(record.row_data);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      rowData = parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  } else {
    if (typeof record.row_data !== 'object' || Array.isArray(record.row_data)) return null;
    rowData = record.row_data as Record<string, unknown>;
  }
  return {
    table_name: record.table_name,
    row_key: record.row_key,
    row_data: rowData,
    ...(typeof record.updated_at === 'string' ? { updated_at: record.updated_at } : {}),
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size) as T[]);
  }
  return result;
}

/**
 * Mirrors the daemon's complete SQLite metadata graph into Supabase tables.
 * The adapter deliberately stores one JSON row per logical SQLite row so the
 * migration can preserve the existing synchronous SQL repository while the
 * application moves incrementally toward native relational repositories.
 */
export class SupabasePostgresPersistence {
  private readonly db: SqliteDb;
  private readonly client: any;
  private readonly tableName: string;
  private readonly stateTableName: string;
  private readonly flushIntervalMs: number;
  private readonly debounceMs: number;
  private readonly logger: Pick<Console, 'warn' | 'error'>;
  private interval: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private rerun = false;
  private dirty = true;
  private disposed = false;
  private revision = 0;
  private legacyDatabaseFile: string | null = null;
  private _lastSuccessfulAt: number | null = null;
  private _lastError: string | null = null;

  constructor(options: SupabasePostgresPersistenceOptions) {
    if (!options.db) throw new StorageError('IO', 'SupabasePostgresPersistence requires a database');
    if (!options.client) throw new StorageError('IO', 'SupabasePostgresPersistence requires a Supabase client');
    this.db = options.db;
    this.client = options.client as any;
    this.tableName = options.tableName?.trim() || 'daemon_table_rows';
    this.stateTableName = options.stateTableName?.trim() || 'daemon_database_state';
    this.flushIntervalMs = boundedInterval(options.flushIntervalMs);
    this.debounceMs = Math.min(DEFAULT_DEBOUNCE_MS, this.flushIntervalMs);
    this.logger = options.logger ?? console;
  }

  get lastSuccessfulAt(): number | null { return this._lastSuccessfulAt; }
  get lastError(): string | null { return this._lastError; }
  get isDirty(): boolean { return this.dirty; }

  status(): SupabasePostgresPersistenceStatus {
    return {
      backend: 'supabase-postgres',
      persistent: true,
      lastSuccessfulAt: this._lastSuccessfulAt,
      lastError: this._lastError,
      dirty: this.dirty,
    };
  }

  /**
   * Load the latest logical rows. A legacy app.sqlite is imported only when
   * the Postgres row store has no state row yet; this prevents a stale local
   * snapshot from overwriting an already-migrated hosted database.
   */
  async restore(options: { legacyDatabaseFile?: string } = {}): Promise<SupabasePostgresRestoreResult> {
    this.assertOpen();
    const legacyFile = options.legacyDatabaseFile?.trim() || null;
    const legacyFilePresent = legacyFile ? await fileExists(legacyFile) : false;
    const remoteRows = await this.readRemoteRows();
    const remoteHasState = await this.remoteStateExists();
    if (remoteRows.length > 0 || remoteHasState) {
      this.replaceDatabaseRows(remoteRows);
      // A pre-migration app.sqlite may still be present when the remote store
      // was populated by another boot. It is no longer authoritative, but it
      // should still be removed after the first successful hosted flush.
      this.legacyDatabaseFile = legacyFilePresent ? legacyFile : null;
      this.dirty = false;
      this._lastError = null;
      const state = await this.readRemoteState();
      this.revision = Number(state?.revision ?? 0);
      return {
        source: 'postgres',
        rowCount: remoteRows.length,
        ...(this.legacyDatabaseFile ? { legacyDatabaseFile: this.legacyDatabaseFile } : {}),
      };
    }

    if (legacyFile && legacyFilePresent) {
      const legacyRows = await this.readLegacyDatabase(legacyFile);
      this.replaceDatabaseRows(legacyRows);
      this.legacyDatabaseFile = legacyFile;
      this.dirty = true;
      return {
        source: 'legacy-sqlite',
        rowCount: legacyRows.length,
        legacyDatabaseFile: legacyFile,
      };
    }

    this.dirty = true;
    return { source: 'empty', rowCount: 0 };
  }

  start(): void {
    this.assertOpen();
    if (this.interval) return;
    this.interval = setInterval(() => {
      void this.flushNow().catch((error) => {
        this.logger.warn(`[db-postgres] periodic flush failed: ${errorMessage(error)}`);
      });
    }, this.flushIntervalMs);
    this.interval.unref?.();
  }

  markDirty(): void {
    if (this.disposed) return;
    this.dirty = true;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.flushNow().catch((error) => {
        this.logger.warn(`[db-postgres] mutation flush failed: ${errorMessage(error)}`);
      });
    }, this.debounceMs);
    this.debounceTimer.unref?.();
  }

  async flushNow({ force = false }: { force?: boolean } = {}): Promise<void> {
    this.assertOpen();
    if (this.inFlight) {
      this.rerun = this.rerun || force || this.dirty;
      await this.inFlight;
      if (this.rerun) {
        this.rerun = false;
        await this.flushNow({ force: true });
      }
      return;
    }
    if (!force && !this.dirty) return;

    const operation = this.flushInternal();
    this.inFlight = operation;
    try {
      await operation;
    } catch (error) {
      this.dirty = true;
      this._lastError = errorMessage(error);
      throw error;
    } finally {
      this.inFlight = null;
    }
    if (this.rerun) {
      this.rerun = false;
      await this.flushNow({ force: true });
    }
  }

  async shutdown(): Promise<void> {
    if (this.disposed) return;
    if (this.interval) clearInterval(this.interval);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.interval = null;
    this.debounceTimer = null;
    await this.flushNow({ force: true });
    this.disposed = true;
  }

  private async flushInternal(): Promise<void> {
    const localRows = snapshotSqliteDatabase(this.db, this.tableName);
    const remoteRows = await this.readRemoteRows();
    const localKeysByTable = new Map<string, Set<string>>();
    for (const row of localRows) {
      let keys = localKeysByTable.get(row.table_name);
      if (!keys) {
        keys = new Set<string>();
        localKeysByTable.set(row.table_name, keys);
      }
      keys.add(row.row_key);
    }

    for (const batch of chunks(localRows, WRITE_CHUNK_SIZE)) {
      if (batch.length === 0) continue;
      const payload = batch.map((row) => ({
        table_name: row.table_name,
        row_key: row.row_key,
        row_data: row.row_data,
        updated_at: new Date().toISOString(),
      }));
      await this.runMutation(
        this.client.from(this.tableName).upsert(payload, {
          onConflict: 'table_name,row_key',
        }),
        'upsert daemon metadata rows',
      );
    }

    const remoteByTable = new Map<string, string[]>();
    for (const row of remoteRows) {
      const keys = remoteByTable.get(row.table_name) ?? [];
      keys.push(row.row_key);
      remoteByTable.set(row.table_name, keys);
    }
    for (const [table, keys] of remoteByTable) {
      const localKeys = localKeysByTable.get(table) ?? new Set<string>();
      const stale = keys.filter((key) => !localKeys.has(key));
      for (const batch of chunks(stale, WRITE_CHUNK_SIZE)) {
        if (batch.length === 0) continue;
        await this.runMutation(
          this.client
            .from(this.tableName)
            .delete()
            .eq('table_name', table)
            .in('row_key', batch),
          'delete stale daemon metadata rows',
        );
      }
    }

    this.revision += 1;
    await this.runMutation(
      this.client.from(this.stateTableName).upsert({
        state_id: SINGLETON_STATE_ID,
        revision: this.revision,
        row_count: localRows.length,
        schema_version: 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'state_id' }),
      'update daemon metadata state',
    );

    this.dirty = false;
    this._lastSuccessfulAt = Date.now();
    this._lastError = null;
    if (this.legacyDatabaseFile) {
      const file = this.legacyDatabaseFile;
      try {
        await removeLegacyDatabaseArtifacts(file);
        this.legacyDatabaseFile = null;
      } catch (error) {
        // The hosted row store is already safe. Retain the path so the next
        // successful flush retries cleanup, and surface the issue in logs.
        this.logger.warn(`[db-postgres] could not remove legacy SQLite file ${file}: ${errorMessage(error)}`);
      }
    }
  }

  private async readRemoteRows(): Promise<RemoteRow[]> {
    const rows: RemoteRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await this.client
        .from(this.tableName)
        .select('table_name,row_key,row_data,updated_at')
        .range(offset, offset + PAGE_SIZE - 1) as SupabaseQueryResult<unknown[]>;
      if (result.error) throw new StorageError('IO', `Supabase metadata read failed: ${result.error.message ?? 'unknown error'}`);
      const page = (result.data ?? []).map(normalizeRemoteRow).filter((row): row is RemoteRow => row !== null);
      rows.push(...page);
      if ((result.data ?? []).length < PAGE_SIZE) break;
    }
    return rows;
  }

  private async remoteStateExists(): Promise<boolean> {
    const result = await this.client
      .from(this.stateTableName)
      .select('state_id')
      .eq('state_id', SINGLETON_STATE_ID)
      .limit(1) as SupabaseQueryResult<unknown[]>;
    if (result.error) throw new StorageError('IO', `Supabase metadata state read failed: ${result.error.message ?? 'unknown error'}`);
    return (result.data ?? []).length > 0;
  }

  private async readRemoteState(): Promise<{ revision?: unknown } | null> {
    const result = await this.client
      .from(this.stateTableName)
      .select('revision')
      .eq('state_id', SINGLETON_STATE_ID)
      .limit(1) as SupabaseQueryResult<Array<{ revision?: unknown }>>;
    if (result.error) throw new StorageError('IO', `Supabase metadata state read failed: ${result.error.message ?? 'unknown error'}`);
    return result.data?.[0] ?? null;
  }

  private async runMutation(request: PromiseLike<SupabaseQueryResult>, description: string): Promise<void> {
    const result = await request;
    if (result.error) {
      this.dirty = true;
      this._lastError = result.error.message ?? description;
      throw new StorageError('IO', `Supabase ${description} failed: ${this._lastError}`);
    }
  }

  private replaceDatabaseRows(rows: readonly LogicalRow[]): void {
    const previousForeignKeys = Number((this.db.pragma('foreign_keys', { simple: true }) as number | undefined) ?? 1);
    this.db.pragma('foreign_keys = OFF');
    try {
      for (const table of tableNames(this.db, this.tableName)) {
        this.db.prepare(`DELETE FROM ${quoteIdentifier(table)}`).run();
      }
      const columnsByTable = new Map(
        tableNames(this.db, this.tableName).map((table) => [table, tableColumns(this.db, table)]),
      );
      for (const logicalRow of rows) {
        const columns = columnsByTable.get(logicalRow.table_name);
        if (!columns || columns.length === 0) continue;
        this.insertLogicalRow(logicalRow, columns);
      }
    } finally {
      this.db.pragma(`foreign_keys = ${previousForeignKeys ? 'ON' : 'OFF'}`);
    }
  }

  private insertLogicalRow(logicalRow: LogicalRow, columns: readonly SqliteColumn[]): void {
    const available = columns.filter((column) => Object.prototype.hasOwnProperty.call(logicalRow.row_data, column.name));
    if (available.length === 0) return;
    const table = quoteIdentifier(logicalRow.table_name);
    const names = available.map((column) => quoteIdentifier(column.name)).join(', ');
    const placeholders = available.map(() => '?').join(', ');
    const values = available.map((column) => decodeSqliteValue(logicalRow.row_data[column.name]));
    try {
      this.db.prepare(`INSERT OR REPLACE INTO ${table} (${names}) VALUES (${placeholders})`).run(...values);
    } catch (error) {
      throw new StorageError(
        'IO',
        `could not hydrate ${logicalRow.table_name}/${logicalRow.row_key}: ${errorMessage(error)}`,
      );
    }
  }

  private async readLegacyDatabase(file: string): Promise<LogicalRow[]> {
    let source: SqliteDb | null = null;
    try {
      source = new Database(file, { readonly: true, fileMustExist: true });
      return snapshotSqliteDatabase(source);
    } catch (error) {
      throw new StorageError('IO', `could not read legacy SQLite database ${file}: ${errorMessage(error)}`);
    } finally {
      source?.close();
    }
  }

  private assertOpen(): void {
    if (this.disposed) throw new StorageError('IO', 'SupabasePostgresPersistence is shut down');
  }
}

export function createSupabasePostgresPersistence(
  env: Record<string, string | undefined> = process.env,
  db: SqliteDb,
  config?: SupabaseDaemonDbConfig,
): SupabasePostgresPersistence {
  const url = config?.url?.trim() || env.SUPABASE_URL?.trim() || '';
  const serviceRoleKey = (
    env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || env.SUPABASE_SECRET_KEY?.trim()
    || ''
  );
  if (!url || !serviceRoleKey) {
    throw new StorageError(
      'IO',
      'Supabase Postgres persistence requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }
  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return new SupabasePostgresPersistence({
    db,
    client,
    ...(config?.table ? { tableName: config.table } : {}),
    ...(config?.stateTable ? { stateTableName: config.stateTable } : {}),
    ...(config?.flushIntervalMs ? { flushIntervalMs: config.flushIntervalMs } : {}),
  });
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fsp.stat(file);
    return true;
  } catch {
    return false;
  }
}

async function removeLegacyDatabaseArtifacts(file: string): Promise<void> {
  const resolved = path.resolve(file);
  for (const artifact of [resolved, `${resolved}-wal`, `${resolved}-shm`]) {
    await fsp.rm(artifact, { force: true });
  }
}
