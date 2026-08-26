export const MOBILE_SCREEN_MANIFEST_PATH = '.od/mobile-manifest.json' as const;
export const MOBILE_SCREEN_LEGACY_MANIFEST_PATH = 'screens/manifest.json' as const;
export const MOBILE_SCREEN_MANIFEST_SCHEMA = 'open-design.mobile-manifest.v1' as const;
const MOBILE_SCREEN_LEGACY_MANIFEST_SCHEMA = 'open-design.mobile-screens.v1' as const;

export interface MobileScreen {
  id: string;
  name: string;
  path: string;
  width: number;
  height: number;
  x: number;
  y: number;
  order?: number;
  orientation?: 'portrait' | 'landscape';
  deviceFrame?: 'generic-phone' | 'iphone' | 'android' | 'tablet';
  createdAt?: number;
  updatedAt?: number;
}

export interface MobileScreenManifest {
  schema: typeof MOBILE_SCREEN_MANIFEST_SCHEMA;
  projectId?: string;
  updatedAt: number;
  screens: MobileScreen[];
}

export const DEFAULT_MOBILE_SCREEN_WIDTH = 390;
export const DEFAULT_MOBILE_SCREEN_HEIGHT = 844;
export const MOBILE_SCREEN_GAP = 72;

export function isMobileScreenPath(name: string): boolean {
  const parts = name.replaceAll('\\', '/').split('/');
  const screenName = parts[1];
  return parts.length === 2
    && parts[0] === 'screens'
    && typeof screenName === 'string'
    && screenName !== 'manifest.json'
    && Boolean(screenName)
    && /\.html$/i.test(screenName);
}

export function mobileScreenNameFromPath(path: string): string {
  const basename = path.split('/').pop()?.replace(/\.html$/i, '') ?? 'Screen';
  return basename
    .replace(/^\d+[-_]/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Screen';
}

export function slugifyMobileScreenName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'screen';
}

export function defaultMobileScreenPosition(index: number): { x: number; y: number } {
  const columns = 3;
  return {
    x: (index % columns) * (DEFAULT_MOBILE_SCREEN_WIDTH + MOBILE_SCREEN_GAP),
    y: Math.floor(index / columns) * (DEFAULT_MOBILE_SCREEN_HEIGHT + MOBILE_SCREEN_GAP),
  };
}

function finitePositive(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function finitePosition(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeScreen(value: unknown, index: number): MobileScreen | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const path = typeof record.path === 'string' ? record.path.trim().replaceAll('\\', '/') : '';
  if (!id || !path || !isMobileScreenPath(path)) return null;
  const position = defaultMobileScreenPosition(index);
  return {
    id,
    name: typeof record.name === 'string' && record.name.trim()
      ? record.name.trim().slice(0, 120)
      : mobileScreenNameFromPath(path),
    path,
    width: finitePositive(record.width, DEFAULT_MOBILE_SCREEN_WIDTH),
    height: finitePositive(record.height, DEFAULT_MOBILE_SCREEN_HEIGHT),
    x: typeof record.x === 'number' && Number.isFinite(record.x) ? record.x : position.x,
    y: typeof record.y === 'number' && Number.isFinite(record.y) ? record.y : position.y,
    ...(typeof record.order === 'number' && Number.isInteger(record.order) && record.order >= 0
      ? { order: record.order }
      : {}),
    orientation: record.orientation === 'landscape' ? 'landscape' : 'portrait',
    deviceFrame: record.deviceFrame === 'iphone' || record.deviceFrame === 'android' || record.deviceFrame === 'tablet'
      ? record.deviceFrame
      : 'generic-phone',
    ...(typeof record.createdAt === 'number' && Number.isFinite(record.createdAt)
      ? { createdAt: record.createdAt }
      : {}),
    ...(typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
      ? { updatedAt: record.updatedAt }
      : {}),
  };
}

export function parseMobileScreenManifest(value: string | null): MobileScreenManifest | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record.screens)) return null;
    const isLegacy = record.schema === MOBILE_SCREEN_LEGACY_MANIFEST_SCHEMA;
    if (record.schema !== MOBILE_SCREEN_MANIFEST_SCHEMA && !isLegacy) return null;
    const seenIds = new Set<string>();
    const seenPaths = new Set<string>();
    const screens = record.screens
      .map((screen, index) => {
        if (!isLegacy && screen && typeof screen === 'object' && !Array.isArray(screen)) {
          const rich = screen as Record<string, unknown>;
          return normalizeScreen({ ...rich, path: rich.file }, index);
        }
        return normalizeScreen(screen, index);
      })
      .filter((screen): screen is MobileScreen => {
        if (!screen || seenIds.has(screen.id) || seenPaths.has(screen.path)) return false;
        seenIds.add(screen.id);
        seenPaths.add(screen.path);
        return true;
      });
    return {
      schema: MOBILE_SCREEN_MANIFEST_SCHEMA,
      ...(typeof record.projectId === 'string' && record.projectId.trim()
        ? { projectId: record.projectId.trim() }
        : {}),
      updatedAt: typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : Date.now(),
      screens,
    };
  } catch {
    return null;
  }
}

export function createMobileScreenManifest(
  projectId: string,
  screens: MobileScreen[] = [],
): MobileScreenManifest {
  return {
    schema: MOBILE_SCREEN_MANIFEST_SCHEMA,
    projectId,
    updatedAt: Date.now(),
    screens,
  };
}

export function serializeMobileScreenManifest(manifest: MobileScreenManifest): string {
  const updatedAt = Date.now();
  return `${JSON.stringify({
    schema: MOBILE_SCREEN_MANIFEST_SCHEMA,
    projectId: manifest.projectId,
    screens: manifest.screens.map((screen, order) => ({
      id: screen.id,
      file: screen.path,
      name: screen.name,
      order: screen.order ?? order,
      x: screen.x,
      y: screen.y,
      width: screen.width,
      height: screen.height,
      orientation: screen.orientation ?? 'portrait',
      deviceFrame: screen.deviceFrame ?? 'generic-phone',
      createdAt: screen.createdAt ?? updatedAt,
      updatedAt,
    })),
    editor: { x: 0, y: 0, zoom: 1 },
    updatedAt,
  }, null, 2)}\n`;
}

export function serializeLegacyMobileScreenManifest(manifest: MobileScreenManifest): string {
  return `${JSON.stringify({
    schema: MOBILE_SCREEN_LEGACY_MANIFEST_SCHEMA,
    projectId: manifest.projectId,
    updatedAt: Date.now(),
    screens: manifest.screens,
  }, null, 2)}\n`;
}

export function starterMobileScreenHtml(title: string): string {
  const escapedCharacters: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&#39;',
  };
  const safeTitle = title.replace(/[<&>"']/g, (character) => escapedCharacters[character] ?? character);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>${safeTitle}</title>
    <style>
      :root { color-scheme: light; font-family: system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #f6f7f9; color: #17181b; }
      main { min-height: 100vh; padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom)); display: grid; place-items: center; text-align: center; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0; color: #626772; }
    </style>
  </head>
  <body><main><div><h1>${safeTitle}</h1><p>Describe this screen in chat to start designing it.</p></div></main></body>
</html>
`;
}
