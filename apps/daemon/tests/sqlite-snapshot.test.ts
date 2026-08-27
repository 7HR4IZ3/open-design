import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createSupabaseSqliteSnapshotStore,
  restoreSqliteSnapshot,
  SqliteSnapshotPersistence,
  SupabaseSqliteSnapshotStore,
  type SqliteSnapshotStore,
} from '../src/storage/sqlite-snapshot.js';
import { StorageError } from '../src/storage/project-storage.js';

const SQLITE_BYTES = Buffer.concat([
  Buffer.from('SQLite format 3\0', 'ascii'),
  Buffer.alloc(32),
]);

let tmp: string;

class MemorySnapshotStore implements SqliteSnapshotStore {
  constructor(public body: Buffer | null) {}
  async readSnapshot(): Promise<Buffer | null> { return this.body; }
  async writeSnapshot(body: Buffer): Promise<void> { this.body = body; }
}

beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'od-db-snapshot-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('SupabaseSqliteSnapshotStore', () => {
  it('uses a private bucket object and round-trips SQLite bytes', async () => {
    let stored: Buffer | null = null;
    let seenBucket = '';
    let seenKey = '';
    const client = {
      storage: {
        from(bucket: string) {
          seenBucket = bucket;
          return {
            async download(key: string) {
              seenKey = key;
              return stored
                ? { data: new Blob([stored]), error: null }
                : { data: null, error: { status: 404, message: 'Not Found' } };
            },
            async upload(key: string, body: Buffer) {
              seenKey = key;
              stored = Buffer.from(body);
              return { data: { path: key }, error: null };
            },
          };
        },
      },
    } as any;
    const store = new SupabaseSqliteSnapshotStore({
      client,
      bucket: 'open-design-database',
      prefix: 'render/daemon',
    });

    expect(await store.readSnapshot()).toBeNull();
    await store.writeSnapshot(SQLITE_BYTES);
    expect(seenBucket).toBe('open-design-database');
    expect(seenKey).toBe('render/daemon/app.sqlite');
    expect((await store.readSnapshot())?.equals(SQLITE_BYTES)).toBe(true);
  });

  it('rejects unsafe prefixes and invalid snapshot payloads', async () => {
    const client = { storage: { from: () => ({}) } } as any;
    expect(() => new SupabaseSqliteSnapshotStore({
      client,
      bucket: 'bucket',
      prefix: '../escape',
    })).toThrow(StorageError);

    const store = new SupabaseSqliteSnapshotStore({ client, bucket: 'bucket' });
    await expect(store.writeSnapshot(Buffer.from('not sqlite'))).rejects.toBeInstanceOf(StorageError);
  });

  it('resolves the service-role configuration without exposing the secret', () => {
    const store = createSupabaseSqliteSnapshotStore({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'server-secret',
      SUPABASE_DATABASE_BUCKET: 'db-bucket',
      SUPABASE_DATABASE_PREFIX: 'one',
    });
    expect(store.options.bucket).toBe('db-bucket');
    expect(store.objectKey()).toBe('one/app.sqlite');
  });
});

describe('restoreSqliteSnapshot', () => {
  it('restores a snapshot when the local database is absent', async () => {
    const targetFile = path.join(tmp, 'data', 'app.sqlite');
    const result = await restoreSqliteSnapshot({
      targetFile,
      store: new MemorySnapshotStore(SQLITE_BYTES),
    });
    expect(result).toMatchObject({ restored: true, reason: 'restored' });
    expect((await readFile(targetFile)).equals(SQLITE_BYTES)).toBe(true);
  });

  it('keeps a usable local database in the safe default mode', async () => {
    const targetFile = path.join(tmp, 'app.sqlite');
    await writeFile(targetFile, SQLITE_BYTES);
    const result = await restoreSqliteSnapshot({
      targetFile,
      store: new MemorySnapshotStore(Buffer.from(SQLITE_BYTES)),
    });
    expect(result).toEqual({ restored: false, reason: 'local-present' });
    expect((await readFile(targetFile)).equals(SQLITE_BYTES)).toBe(true);
  });

  it('preserves local artifacts when explicitly replacing with the remote snapshot', async () => {
    const targetFile = path.join(tmp, 'app.sqlite');
    const local = Buffer.concat([SQLITE_BYTES, Buffer.from('local')]);
    await writeFile(targetFile, local);
    const remote = Buffer.concat([SQLITE_BYTES, Buffer.from('remote')]);
    const result = await restoreSqliteSnapshot({
      targetFile,
      store: new MemorySnapshotStore(remote),
      mode: 'always',
    });
    expect(result.restored).toBe(true);
    expect(result.localBackupFile).toBeTruthy();
    expect((await readFile(targetFile)).equals(remote)).toBe(true);
    expect((await readFile(result.localBackupFile!)).equals(local)).toBe(true);
  });
});

describe('SqliteSnapshotPersistence', () => {
  it('backs up the database and retries after a failed upload', async () => {
    let attempts = 0;
    const writes: Buffer[] = [];
    const store: SqliteSnapshotStore = {
      async readSnapshot() { return null; },
      async writeSnapshot(body) {
        attempts += 1;
        if (attempts === 1) throw new Error('temporary storage outage');
        writes.push(body);
      },
    };
    const persistence = new SqliteSnapshotPersistence({
      db: {
        async backup(destinationFile: string) {
          await writeFile(destinationFile, SQLITE_BYTES);
          return {} as any;
        },
      },
      store,
      flushIntervalMs: 1_000,
      debounceMs: 0,
      logger: { warn() {}, error() {} },
    });

    await expect(persistence.flushNow({ force: true })).rejects.toThrow('temporary storage outage');
    await persistence.flushNow({ force: true });
    expect(attempts).toBe(2);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.equals(SQLITE_BYTES)).toBe(true);
    await persistence.shutdown();
  });
});
