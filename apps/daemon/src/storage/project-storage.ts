// Phase 5 / spec §15.6 — `ProjectStorage` adapter interface.
//
// The daemon's project filesystem usage today is concentrated in
// `apps/daemon/src/projects.ts` (read/write/list/delete). Spec §15.6
// folds those calls behind a narrow interface so a future Phase 5
// patch can swap the implementation between local-disk (v1 default)
// and S3-compatible blob stores (AWS S3, GCS S3-compat, Azure Blob
// shim, Aliyun OSS, Tencent COS, Huawei OBS) without rewriting
// callers.
//
// This module is the substrate slice. It ships:
//
//   - `ProjectStorage` interface — the narrow contract every backend
//     implements (read / write / list / delete / stat).
//   - `LocalProjectStorage` — a thin wrapper over the existing
//     `apps/daemon/src/projects.ts` helpers; this is the v1 default.
//   - `S3ProjectStorage` — an S3-compatible implementation.
//   - `SupabaseProjectStorage` — a private Supabase Storage implementation.
//
// The daemon's existing project routes don't yet route through this
// adapter — that's an opt-in flag away (`OD_PROJECT_STORAGE=s3`).
// The substrate slice keeps the call sites unchanged so a wrong
// adapter never silently corrupts user data on roll-out.

import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { encodeS3PathSegment, signSigV4, type SigV4Credentials } from './aws-sigv4.js';

export interface ProjectFileMeta {
  // Path relative to the project root. Always uses forward slashes.
  path: string;
  // Total size in bytes.
  size: number;
  // Unix epoch milliseconds of last modification.
  mtimeMs: number;
}

export interface ProjectStorage {
  // Reads `<projectId>/<relpath>` into a Buffer. Throws ENOENT-style
  // errors when missing; the caller maps to HTTP 404.
  readFile(projectId: string, relpath: string): Promise<Buffer>;
  // Writes `<projectId>/<relpath>` atomically. The default
  // implementation creates parent directories as needed.
  writeFile(projectId: string, relpath: string, body: Buffer): Promise<ProjectFileMeta>;
  // Lists every file under `<projectId>/` recursively. The order is
  // implementation-defined; callers that need deterministic order
  // sort by `path`.
  listFiles(projectId: string): Promise<ProjectFileMeta[]>;
  // Deletes a single file under `<projectId>/`. Idempotent — missing
  // files do not throw.
  deleteFile(projectId: string, relpath: string): Promise<void>;
  // Reports metadata for a single file without reading its bytes.
  // Returns null when the file is missing.
  statFile(projectId: string, relpath: string): Promise<ProjectFileMeta | null>;
}

export class StorageError extends Error {
  readonly code: 'NOT_FOUND' | 'TRAVERSAL' | 'IO';
  constructor(code: 'NOT_FOUND' | 'TRAVERSAL' | 'IO', message: string) {
    super(message);
    this.code = code;
    this.name = 'StorageError';
  }
}

/**
 * v1 default — backed by the daemon's existing `<dataDir>/.od/projects/`
 * filesystem layout. Pure pass-through to fs/promises with the
 * traversal guard the legacy `projects.ts` helpers already enforce.
 */
export class LocalProjectStorage implements ProjectStorage {
  constructor(private readonly projectsRoot: string) {}

  async readFile(projectId: string, relpath: string): Promise<Buffer> {
    const abs = this.resolvePath(projectId, relpath);
    try {
      return await fsp.readFile(abs);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ENOENT') throw new StorageError('NOT_FOUND', `${projectId}/${relpath} not found`);
      throw new StorageError('IO', `read failed: ${e.message ?? String(e)}`);
    }
  }

  async writeFile(projectId: string, relpath: string, body: Buffer): Promise<ProjectFileMeta> {
    const abs = this.resolvePath(projectId, relpath);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, body);
    const stat = await fsp.stat(abs);
    return {
      path:    normalizeRel(relpath),
      size:    stat.size,
      mtimeMs: stat.mtimeMs,
    };
  }

  async listFiles(projectId: string): Promise<ProjectFileMeta[]> {
    const root = path.join(this.projectsRoot, projectId);
    const out: ProjectFileMeta[] = [];
    const queue: string[] = [root];
    while (queue.length > 0) {
      const dir = queue.pop()!;
      let entries;
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw new StorageError('IO', `list failed: ${(err as Error).message}`);
      }
      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          queue.push(abs);
          continue;
        }
        if (!entry.isFile()) continue;
        const stat = await fsp.stat(abs);
        const rel = path.relative(root, abs).split(path.sep).join('/');
        out.push({ path: rel, size: stat.size, mtimeMs: stat.mtimeMs });
      }
    }
    return out;
  }

  async deleteFile(projectId: string, relpath: string): Promise<void> {
    const abs = this.resolvePath(projectId, relpath);
    try {
      await fsp.rm(abs, { force: true });
    } catch (err) {
      throw new StorageError('IO', `delete failed: ${(err as Error).message}`);
    }
  }

  async statFile(projectId: string, relpath: string): Promise<ProjectFileMeta | null> {
    const abs = this.resolvePath(projectId, relpath);
    try {
      const stat = await fsp.stat(abs);
      if (!stat.isFile()) return null;
      return {
        path:    normalizeRel(relpath),
        size:    stat.size,
        mtimeMs: stat.mtimeMs,
      };
    } catch {
      return null;
    }
  }

  private resolvePath(projectId: string, relpath: string): string {
    if (!projectId || projectId.includes('/') || projectId.includes('\\') || projectId.includes('\0') || projectId.includes('..')) {
      throw new StorageError('TRAVERSAL', `invalid projectId ${projectId}`);
    }
    const normalized = normalizeRel(relpath);
    if (!normalized) throw new StorageError('TRAVERSAL', 'empty relpath');
    if (normalized.split('/').some((seg) => seg === '..' || seg === '.')) {
      throw new StorageError('TRAVERSAL', `unsafe relpath ${relpath}`);
    }
    return path.join(this.projectsRoot, projectId, ...normalized.split('/'));
  }
}

/**
 * Phase 5 / spec §15.6 / plan §3.U1 — S3-compatible blob backend.
 *
 * Signs requests inline with AWS SigV4 (see ./aws-sigv4.ts) using
 * only node:crypto. No `@aws-sdk/*` dep is pulled in; the backend
 * targets AWS S3 + every S3-compatible store the spec lists (Aliyun
 * OSS, Tencent COS, Huawei OBS, MinIO).
 *
 * Five operations:
 *   readFile    \u2192 GET    /<key>
 *   writeFile   \u2192 PUT    /<key>          (with x-amz-content-sha256)
 *   deleteFile  \u2192 DELETE /<key>
 *   statFile    \u2192 HEAD   /<key>
 *   listFiles   \u2192 GET    /?list-type=2&prefix=<projectId>/...
 *
 * Network is pluggable: pass `fetchFn` in the constructor (tests
 * inject a stub; production defaults to globalThis.fetch).
 */
export interface S3ProjectStorageOptions {
  bucket:    string;
  region:    string;
  // Optional path prefix inside the bucket. Lets multiple OD
  // deployments share one bucket.
  prefix?:   string;
  // S3-compatible endpoint URL (Aliyun OSS, Tencent COS, Huawei OBS,
  // MinIO). Omit for AWS S3.
  endpoint?: string;
  // AWS access credentials. Read from OD_S3_ACCESS_KEY_ID /
  // OD_S3_SECRET_ACCESS_KEY by resolveProjectStorage(); the test
  // harness can pass them directly.
  credentials: SigV4Credentials;
  // Pluggable fetch for tests. Defaults to globalThis.fetch.
  fetchFn?: typeof fetch;
  // Override for clock — tests pin signatures with this. Production
  // leaves it undefined (signSigV4 falls back to `new Date()`).
  now?: () => Date;
}

export class S3ProjectStorage implements ProjectStorage {
  private readonly fetchFn: typeof fetch;
  constructor(public readonly options: S3ProjectStorageOptions) {
    if (!options.bucket) throw new StorageError('IO', 'S3ProjectStorage requires a bucket');
    if (!options.region) throw new StorageError('IO', 'S3ProjectStorage requires a region');
    if (!options.credentials?.accessKeyId)     throw new StorageError('IO', 'S3ProjectStorage requires credentials.accessKeyId');
    if (!options.credentials?.secretAccessKey) throw new StorageError('IO', 'S3ProjectStorage requires credentials.secretAccessKey');
    const fn = options.fetchFn ?? globalThis.fetch;
    if (!fn) throw new StorageError('IO', 'S3ProjectStorage requires a fetch implementation');
    this.fetchFn = fn;
  }

  async readFile(projectId: string, relpath: string): Promise<Buffer> {
    const key = this.keyFor(projectId, relpath);
    const res = await this.signedRequest({ method: 'GET', key });
    if (res.status === 404) throw new StorageError('NOT_FOUND', `${projectId}/${relpath} not found`);
    if (!res.ok) throw new StorageError('IO', `S3 GET ${key} \u2192 ${res.status} ${res.statusText}: ${await safeText(res)}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async writeFile(projectId: string, relpath: string, body: Buffer): Promise<ProjectFileMeta> {
    const key = this.keyFor(projectId, relpath);
    const res = await this.signedRequest({ method: 'PUT', key, body });
    if (!res.ok) throw new StorageError('IO', `S3 PUT ${key} \u2192 ${res.status} ${res.statusText}: ${await safeText(res)}`);
    return {
      path:    normalizeRel(relpath),
      size:    body.byteLength,
      mtimeMs: Date.now(),
    };
  }

  async deleteFile(projectId: string, relpath: string): Promise<void> {
    const key = this.keyFor(projectId, relpath);
    const res = await this.signedRequest({ method: 'DELETE', key });
    // S3 returns 204 on successful delete; idempotent if missing.
    if (!res.ok && res.status !== 404) {
      throw new StorageError('IO', `S3 DELETE ${key} \u2192 ${res.status} ${res.statusText}: ${await safeText(res)}`);
    }
  }

  async statFile(projectId: string, relpath: string): Promise<ProjectFileMeta | null> {
    const key = this.keyFor(projectId, relpath);
    const res = await this.signedRequest({ method: 'HEAD', key });
    if (res.status === 404) return null;
    if (!res.ok) throw new StorageError('IO', `S3 HEAD ${key} \u2192 ${res.status} ${res.statusText}`);
    const contentLength = Number(res.headers.get('content-length') ?? '0');
    const lastModified = res.headers.get('last-modified');
    return {
      path:    normalizeRel(relpath),
      size:    Number.isFinite(contentLength) ? contentLength : 0,
      mtimeMs: lastModified ? Date.parse(lastModified) : Date.now(),
    };
  }

  async listFiles(projectId: string): Promise<ProjectFileMeta[]> {
    const projectPrefix = this.keyFor(projectId, '');
    const out: ProjectFileMeta[] = [];
    let continuationToken: string | undefined;
    // Cap iterations so a hostile bucket can't loop forever.
    for (let pages = 0; pages < 1000; pages++) {
      const params: Array<[string, string]> = [
        ['list-type', '2'],
        ['prefix', projectPrefix],
      ];
      if (continuationToken) params.push(['continuation-token', continuationToken]);
      params.sort((a, b) => a[0].localeCompare(b[0]));
      const query = params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const res = await this.signedRequest({ method: 'GET', key: '', extraQuery: query });
      if (!res.ok) {
        throw new StorageError('IO', `S3 LIST ${projectPrefix} \u2192 ${res.status} ${res.statusText}: ${await safeText(res)}`);
      }
      const xml = await res.text();
      const { entries, isTruncated, nextToken } = parseListBucketV2Xml(xml);
      for (const e of entries) {
        // Strip the per-bucket projectPrefix to surface project-relative paths.
        const relStart = projectPrefix ? projectPrefix.length + (projectPrefix.endsWith('/') ? 0 : 1) : 0;
        const rel = e.key.slice(relStart).replace(/^\/+/, '');
        if (!rel) continue; // skip the prefix marker itself
        out.push({ path: rel, size: e.size, mtimeMs: e.lastModifiedMs });
      }
      if (!isTruncated || !nextToken) break;
      continuationToken = nextToken;
    }
    return out;
  }

  // Build the canonical S3 key the impl uses. Exposed for tests so
  // the prefix / projectId / relpath join is stable.
  keyFor(projectId: string, relpath: string): string {
    if (!projectId || projectId.includes('/') || projectId.includes('\\') || projectId.includes('..')) {
      throw new StorageError('TRAVERSAL', `invalid projectId ${projectId}`);
    }
    const normalized = relpath ? normalizeRel(relpath) : '';
    if (normalized.split('/').some((seg) => seg === '..' || seg === '.')) {
      throw new StorageError('TRAVERSAL', `unsafe relpath ${relpath}`);
    }
    const segments = [this.options.prefix?.replace(/^\/+|\/+$/g, ''), projectId, normalized]
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    return segments.join('/');
  }

  private endpointBase(): string {
    if (this.options.endpoint) return this.options.endpoint.replace(/\/+$/, '');
    return `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com`;
  }

  private async signedRequest(args: {
    method:     string;
    key:        string;
    body?:      Buffer;
    extraQuery?: string;
  }): Promise<Response> {
    const base = this.endpointBase();
    const baseHost = new URL(base).host;
    // Path-style for endpoint overrides (typical for S3-compat
    // services + MinIO test setups); virtual-host-style when
    // endpoint is omitted (default AWS S3).
    let pathSegment: string;
    let host: string;
    if (this.options.endpoint) {
      const segments = [this.options.bucket, ...args.key.split('/').filter(Boolean).map(encodeS3PathSegment)];
      pathSegment = '/' + segments.join('/');
      host = baseHost;
    } else {
      const segments = args.key.split('/').filter(Boolean).map(encodeS3PathSegment);
      pathSegment = segments.length === 0 ? '/' : '/' + segments.join('/');
      host = baseHost;
    }

    const headers: Record<string, string> = {
      'host': host,
    };
    const body = args.body ?? Buffer.alloc(0);
    const now = this.options.now ? this.options.now() : new Date();
    signSigV4({
      method:  args.method,
      path:    pathSegment,
      query:   args.extraQuery ?? '',
      headers,
      body,
      region:  this.options.region,
      service: 's3',
      credentials: this.options.credentials,
      now,
    });

    const url = `${base.replace(/\/+$/, '')}${pathSegment}${args.extraQuery ? `?${args.extraQuery}` : ''}`;
    const init: RequestInit = {
      method:  args.method,
      headers,
      ...(args.body ? { body: args.body } : {}),
    };
    return this.fetchFn(url, init);
  }
}

export interface SupabaseProjectStorageOptions {
  client: SupabaseClient;
  bucket: string;
  /** Optional namespace inside the bucket; defaults to `projects`. */
  prefix?: string;
  maxListEntries?: number;
}

/**
 * Supabase Storage adapter for hosted project files.
 *
 * The daemon uses a service-role client, so the bucket should remain private;
 * all project authorization happens before this adapter is called. Files are
 * stored under `<prefix>/<projectId>/files/<relative-path>` and are never
 * exposed through a public bucket URL.
 */
export class SupabaseProjectStorage implements ProjectStorage {
  private readonly maxListEntries: number;

  constructor(public readonly options: SupabaseProjectStorageOptions) {
    if (!options.client) throw new StorageError('IO', 'SupabaseProjectStorage requires a client');
    if (!options.bucket) throw new StorageError('IO', 'SupabaseProjectStorage requires a bucket');
    this.maxListEntries = options.maxListEntries ?? 10_000;
    if (!Number.isSafeInteger(this.maxListEntries) || this.maxListEntries < 1) {
      throw new StorageError('IO', 'SupabaseProjectStorage maxListEntries must be positive');
    }
  }

  async readFile(projectId: string, relpath: string): Promise<Buffer> {
    const { data, error } = await this.options.client.storage
      .from(this.options.bucket)
      .download(this.keyFor(projectId, relpath));
    if (error) {
      if (isSupabaseNotFound(error)) {
        throw new StorageError('NOT_FOUND', `${projectId}/${relpath} not found`);
      }
      throw new StorageError('IO', `Supabase Storage download failed: ${error.message}`);
    }
    if (!data) throw new StorageError('IO', 'Supabase Storage download returned no data');
    return Buffer.from(await data.arrayBuffer());
  }

  async writeFile(projectId: string, relpath: string, body: Buffer): Promise<ProjectFileMeta> {
    validateStoragePath(projectId, relpath);
    const normalized = normalizeRel(relpath);
    const { error } = await this.options.client.storage
      .from(this.options.bucket)
      .upload(this.keyFor(projectId, normalized), body, {
        upsert: true,
        contentType: contentTypeForPath(normalized),
      });
    if (error) throw new StorageError('IO', `Supabase Storage upload failed: ${error.message}`);
    return { path: normalized, size: body.byteLength, mtimeMs: Date.now() };
  }

  async listFiles(projectId: string): Promise<ProjectFileMeta[]> {
    const root = this.folderFor(projectId);
    const output: ProjectFileMeta[] = [];
    const walk = async (folder: string): Promise<void> => {
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await this.options.client.storage
          .from(this.options.bucket)
          .list(folder, {
            limit: pageSize,
            offset,
            sortBy: { column: 'name', order: 'asc' },
          });
        if (error) throw new StorageError('IO', `Supabase Storage list failed: ${error.message}`);
        const entries = data ?? [];
        for (const entry of entries) {
          if (output.length >= this.maxListEntries) {
            throw new StorageError('IO', `Supabase Storage file limit exceeded (${this.maxListEntries})`);
          }
          const name = typeof entry.name === 'string' ? entry.name : '';
          if (!name || name === '.' || name === '..') continue;
          const child = `${folder}/${name}`;
          // Storage folder entries have no object id; regular files do.
          if (!entry.id) {
            await walk(child);
            continue;
          }
          const rel = child.slice(`${root}/`.length);
          const metadata = entry.metadata as Record<string, unknown> | null | undefined;
          const size = Number(metadata?.size ?? 0);
          const updatedAt = typeof entry.updated_at === 'string' ? Date.parse(entry.updated_at) : NaN;
          output.push({
            path: rel,
            size: Number.isFinite(size) ? size : 0,
            mtimeMs: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
          });
        }
        if (entries.length < pageSize) break;
        offset += entries.length;
      }
    };
    await walk(root);
    return output;
  }

  async deleteFile(projectId: string, relpath: string): Promise<void> {
    const { error } = await this.options.client.storage
      .from(this.options.bucket)
      .remove([this.keyFor(projectId, relpath)]);
    if (error && !isSupabaseNotFound(error)) {
      throw new StorageError('IO', `Supabase Storage delete failed: ${error.message}`);
    }
  }

  async statFile(projectId: string, relpath: string): Promise<ProjectFileMeta | null> {
    validateStoragePath(projectId, relpath);
    const normalized = normalizeRel(relpath);
    const slash = normalized.lastIndexOf('/');
    const parent = slash < 0
      ? this.folderFor(projectId)
      : `${this.folderFor(projectId)}/${normalized.slice(0, slash)}`;
    const filename = normalized.slice(slash + 1);
    const { data, error } = await this.options.client.storage
      .from(this.options.bucket)
      .list(parent, { limit: 1000, offset: 0 });
    if (error) throw new StorageError('IO', `Supabase Storage list failed: ${error.message}`);
    const entry = (data ?? []).find((item) => item.id && item.name === filename);
    if (!entry) return null;
    const metadata = entry.metadata as Record<string, unknown> | null | undefined;
    const size = Number(metadata?.size ?? 0);
    const updatedAt = typeof entry.updated_at === 'string' ? Date.parse(entry.updated_at) : NaN;
    return {
      path: normalized,
      size: Number.isFinite(size) ? size : 0,
      mtimeMs: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    };
  }

  keyFor(projectId: string, relpath: string): string {
    validateStoragePath(projectId, relpath);
    return `${this.folderFor(projectId)}/${normalizeRel(relpath)}`;
  }

  private folderFor(projectId: string): string {
    validateStorageProjectId(projectId);
    const prefix = (this.options.prefix?.trim() || 'projects').replace(/^\/+|\/+$/g, '');
    return `${prefix}/${projectId}/files`;
  }
}

/**
 * Keeps the ephemeral local project view warm while Supabase is authoritative.
 * The local copy is useful for preview/rendering code that still expects a
 * filesystem path; failures in the local mirror never make a successful cloud
 * write look failed.
 */
export class MirroredProjectStorage implements ProjectStorage {
  constructor(
    public readonly remote: ProjectStorage,
    public readonly local: ProjectStorage,
  ) {}

  async readFile(projectId: string, relpath: string): Promise<Buffer> {
    const body = await this.remote.readFile(projectId, relpath);
    await this.mirrorWrite(projectId, relpath, body);
    return body;
  }

  async writeFile(projectId: string, relpath: string, body: Buffer): Promise<ProjectFileMeta> {
    const meta = await this.remote.writeFile(projectId, relpath, body);
    await this.mirrorWrite(projectId, relpath, body);
    return meta;
  }

  listFiles(projectId: string): Promise<ProjectFileMeta[]> {
    return this.remote.listFiles(projectId);
  }

  async deleteFile(projectId: string, relpath: string): Promise<void> {
    await this.remote.deleteFile(projectId, relpath);
    try {
      await this.local.deleteFile(projectId, relpath);
    } catch (error) {
      console.warn('[project-storage] local mirror delete failed', error);
    }
  }

  async statFile(projectId: string, relpath: string): Promise<ProjectFileMeta | null> {
    return this.remote.statFile(projectId, relpath);
  }

  private async mirrorWrite(projectId: string, relpath: string, body: Buffer): Promise<void> {
    try {
      await this.local.writeFile(projectId, relpath, body);
    } catch (error) {
      console.warn('[project-storage] local mirror write failed', error);
    }
  }
}

function validateStorageProjectId(projectId: string): void {
  if (!projectId || projectId.includes('/') || projectId.includes('\\') || projectId.includes('\0') || projectId.includes('..')) {
    throw new StorageError('TRAVERSAL', `invalid projectId ${projectId}`);
  }
}

function validateStoragePath(projectId: string, relpath: string): void {
  validateStorageProjectId(projectId);
  if (typeof relpath !== 'string' || /^[\\/]/u.test(relpath)) {
    throw new StorageError('TRAVERSAL', `unsafe relpath ${relpath}`);
  }
  const normalized = normalizeRel(relpath);
  if (!normalized || normalized.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new StorageError('TRAVERSAL', `unsafe relpath ${relpath}`);
  }
}

function isSupabaseNotFound(error: { status?: number | undefined; message?: string | undefined }): boolean {
  return error.status === 404 || /not found|does not exist|no such/i.test(error.message ?? '');
}

function contentTypeForPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
  };
  return types[extension] ?? 'application/octet-stream';
}

interface ListBucketEntry { key: string; size: number; lastModifiedMs: number }

function parseListBucketV2Xml(xml: string): { entries: ListBucketEntry[]; isTruncated: boolean; nextToken?: string } {
  const entries: ListBucketEntry[] = [];
  // Lightweight XML scrape — we accept S3 / S3-compat shapes:
  //   <Contents>
  //     <Key>...</Key>
  //     <LastModified>2026-...</LastModified>
  //     <Size>1234</Size>
  //   </Contents>
  // and a single <NextContinuationToken>...</NextContinuationToken>
  // and <IsTruncated>true|false</IsTruncated>.
  const contentsRe = /<Contents\b[^>]*>([\s\S]*?)<\/Contents>/g;
  let m: RegExpExecArray | null;
  while ((m = contentsRe.exec(xml)) !== null) {
    const block = m[1] ?? '';
    const key = pluckTag(block, 'Key');
    const size = Number(pluckTag(block, 'Size') ?? '0');
    const lastModifiedRaw = pluckTag(block, 'LastModified');
    if (!key) continue;
    entries.push({
      key,
      size: Number.isFinite(size) ? size : 0,
      lastModifiedMs: lastModifiedRaw ? Date.parse(lastModifiedRaw) : Date.now(),
    });
  }
  const isTruncated = (pluckTag(xml, 'IsTruncated') ?? 'false').toLowerCase() === 'true';
  const nextToken = pluckTag(xml, 'NextContinuationToken') ?? undefined;
  return nextToken ? { entries, isTruncated, nextToken } : { entries, isTruncated };
}

function pluckTag(text: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = re.exec(text);
  return m ? m[1] : undefined;
}

async function safeText(res: Response): Promise<string> {
  try { return (await res.text()).slice(0, 256); } catch { return ''; }
}

/**
 * Resolve the daemon-wide project storage adapter from environment.
 * Default is local-disk. Supabase uses a private Storage bucket and a
 * daemon-only service-role key; the public publishable key must never be used
 * here.
 */
export function resolveProjectStorage(opts: {
  projectsRoot: string;
  env?: Record<string, string | undefined>;
}): ProjectStorage {
  const env = opts.env ?? process.env;
  const kind = (env.OD_PROJECT_STORAGE ?? 'local').trim().toLowerCase();
  if (kind === 's3') {
    // Read AWS creds from the OD-specific knobs first, then fall
    // back to the standard AWS_* env vars so existing AWS toolchain
    // setups (`aws configure` exporters, IAM-role pods) drop in
    // without renaming.
    const accessKeyId     = env.OD_S3_ACCESS_KEY_ID     ?? env.AWS_ACCESS_KEY_ID     ?? '';
    const secretAccessKey = env.OD_S3_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY ?? '';
    const sessionToken    = env.OD_S3_SESSION_TOKEN     ?? env.AWS_SESSION_TOKEN;
    const credentials: SigV4Credentials = { accessKeyId, secretAccessKey };
    if (sessionToken) credentials.sessionToken = sessionToken;
    return new S3ProjectStorage({
      bucket:   env.OD_S3_BUCKET ?? '',
      region:   env.OD_S3_REGION ?? env.AWS_REGION ?? '',
      ...(env.OD_S3_PREFIX   ? { prefix:   env.OD_S3_PREFIX }   : {}),
      ...(env.OD_S3_ENDPOINT ? { endpoint: env.OD_S3_ENDPOINT } : {}),
      credentials,
    });
  }
  if (kind === 'supabase') {
    const url = env.SUPABASE_URL?.trim() ?? '';
    const serviceRoleKey = (
      env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      || env.SUPABASE_SECRET_KEY?.trim()
      || ''
    );
    if (!url || !serviceRoleKey) {
      throw new StorageError(
        'IO',
        'OD_PROJECT_STORAGE=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      );
    }
    return new SupabaseProjectStorage({
      client: createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      }),
      bucket: env.SUPABASE_STORAGE_BUCKET ?? 'open-design-projects',
      ...(env.SUPABASE_STORAGE_PREFIX ? { prefix: env.SUPABASE_STORAGE_PREFIX } : {}),
    });
  }
  return new LocalProjectStorage(opts.projectsRoot);
}

function normalizeRel(relpath: string): string {
  return String(relpath || '')
    .replace(/^[\\/]+/, '')
    .replace(/[\\]+/g, '/')
    .replace(/\/+/g, '/');
}
