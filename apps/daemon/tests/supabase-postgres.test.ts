import { afterEach, describe, expect, it } from 'vitest';
import { access, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  closeDatabase,
  getProject,
  insertConversation,
  insertProject,
  openDatabase,
} from '../src/db.js';
import { SupabasePostgresPersistence } from '../src/storage/supabase-postgres.js';

type StoredRow = Record<string, any>;

/** Small PostgREST-shaped fake: enough to exercise pagination, upsert, and delete. */
function fakeSupabase() {
  const tables = new Map<string, Map<string, StoredRow>>();
  const table = (name: string) => {
    let rows = tables.get(name);
    if (!rows) {
      rows = new Map();
      tables.set(name, rows);
    }
    return rows;
  };
  const from = (name: string) => {
    let operation: 'select' | 'delete' = 'select';
    const filters: Array<[string, unknown]> = [];
    let inFilter: [string, unknown[]] | null = null;
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        inFilter = [column, values];
        return builder;
      },
      range: (start: number, end: number) => Promise.resolve({
        data: selectedRows().slice(start, end + 1),
        error: null,
      }),
      limit: (count: number) => Promise.resolve({
        data: selectedRows().slice(0, count),
        error: null,
      }),
      upsert: async (input: StoredRow | StoredRow[]) => {
        const entries = Array.isArray(input) ? input : [input];
        const destination = table(name);
        for (const entry of entries) {
          const key = name === 'daemon_table_rows'
            ? `${entry.table_name}:${entry.row_key}`
            : String(entry.state_id ?? entry.id ?? `${entry.project_id}:${entry.path}`);
          destination.set(key, { ...entry });
        }
        return { data: null, error: null };
      },
      delete: () => {
        operation = 'delete';
        return builder;
      },
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve(execute()).then(resolve, reject),
    };
    function selectedRows(): StoredRow[] {
      return [...table(name).values()].filter((row) => (
        filters.every(([column, value]) => row[column] === value)
        && (!inFilter || inFilter[1].includes(row[inFilter[0]]))
      ));
    }
    function execute() {
      if (operation === 'delete') {
        for (const [key, row] of table(name)) {
          if (
            filters.every(([column, value]) => row[column] === value)
            && (!inFilter || inFilter[1].includes(row[inFilter[0]]))
          ) table(name).delete(key);
        }
      }
      return { data: operation === 'select' ? selectedRows() : null, error: null };
    }
    return builder;
  };
  return {
    from,
    rows: (name: string) => [...table(name).values()],
  } as any;
}

let dirs: string[] = [];

afterEach(async () => {
  closeDatabase();
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe('SupabasePostgresPersistence', () => {
  it('persists the complete synchronous metadata cache without creating app.sqlite', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'od-postgres-'));
    dirs.push(dir);
    const db = openDatabase(dir, { dataDir: dir, storage: 'memory' });
    insertProject(db, {
      id: 'project-a',
      name: 'Project A',
      ownerId: '11111111-1111-1111-1111-111111111111',
      createdAt: 100,
      updatedAt: 200,
    });
    insertConversation(db, {
      id: 'conversation-a',
      projectId: 'project-a',
      title: 'First turn',
      createdAt: 100,
      updatedAt: 200,
    });

    const client = fakeSupabase();
    const persistence = new SupabasePostgresPersistence({
      db,
      client,
      flushIntervalMs: 1_000,
    });
    expect((await persistence.restore()).source).toBe('empty');
    await persistence.flushNow({ force: true });

    expect(client.rows('daemon_table_rows')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table_name: 'projects' }),
        expect.objectContaining({ table_name: 'conversations' }),
      ]),
    );
    expect(client.rows('daemon_database_state')).toHaveLength(1);
    await expect(access(path.join(dir, 'app.sqlite'))).rejects.toThrow();

    closeDatabase();
    const restoredDb = openDatabase(dir, { dataDir: dir, storage: 'memory' });
    const restored = new SupabasePostgresPersistence({ db: restoredDb, client });
    const result = await restored.restore();
    expect(result).toMatchObject({ source: 'postgres' });
    expect(getProject(restoredDb, 'project-a')?.name).toBe('Project A');
    expect(restoredDb.prepare('SELECT title FROM conversations WHERE id = ?').get('conversation-a'))
      .toMatchObject({ title: 'First turn' });
  });

  it('imports a legacy app.sqlite once, flushes it, and removes the SQLite artifacts', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'od-postgres-legacy-'));
    dirs.push(dir);
    const legacyDb = openDatabase(dir, { dataDir: dir, storage: 'file' });
    insertProject(legacyDb, {
      id: 'legacy-project',
      name: 'Legacy project',
      ownerId: '22222222-2222-2222-2222-222222222222',
      createdAt: 100,
      updatedAt: 100,
    });
    closeDatabase();

    const db = openDatabase(dir, { dataDir: dir, storage: 'memory' });
    const client = fakeSupabase();
    const persistence = new SupabasePostgresPersistence({ db, client });
    const result = await persistence.restore({ legacyDatabaseFile: path.join(dir, 'app.sqlite') });
    expect(result).toMatchObject({ source: 'legacy-sqlite', rowCount: expect.any(Number) });
    await persistence.flushNow({ force: true });
    expect(client.rows('daemon_table_rows')).toEqual(
      expect.arrayContaining([expect.objectContaining({ table_name: 'projects' })]),
    );
    await expect(access(path.join(dir, 'app.sqlite'))).rejects.toThrow();
  });
});
