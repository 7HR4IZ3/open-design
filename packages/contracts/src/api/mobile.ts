export const MOBILE_MANIFEST_SCHEMA = 'open-design.mobile-manifest.v1' as const;
export const MOBILE_MANIFEST_FILE = '.od/mobile-manifest.json' as const;
export const MOBILE_MAX_SCREENS = 100 as const;

export type ProjectPlatformMode = 'web' | 'mobile';

export type MobileOrientation = 'portrait' | 'landscape';

export type MobileDeviceFrame =
  | 'generic-phone'
  | 'iphone'
  | 'android'
  | 'tablet';

export type MobileTransition =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'modal';

export interface MobileScreenRecord {
  id: string;
  file: string;
  name: string;
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: MobileOrientation;
  deviceFrame: MobileDeviceFrame;
  transition?: MobileTransition;
  routeKey?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MobileEditorState {
  x: number;
  y: number;
  zoom: number;
}

export interface MobileEditorMetadata {
  schemaVersion: 1;
  manifestFile: typeof MOBILE_MANIFEST_FILE;
  screens: MobileScreenRecord[];
  editor: MobileEditorState;
  selectedScreenId?: string | null;
  maxScreens: typeof MOBILE_MAX_SCREENS;
  updatedAt: number;
}

export interface MobileManifest {
  schema: typeof MOBILE_MANIFEST_SCHEMA;
  projectId: string;
  screens: MobileScreenRecord[];
  editor: MobileEditorState;
  selectedScreenId?: string | null;
  updatedAt: number;
}

export function parseMobileManifest(
  value: string | null,
  expectedProjectId?: string,
): MobileManifest | null {
  if (!value) return null;
  try {
    return normalizeMobileManifestDocument(JSON.parse(value) as unknown, expectedProjectId);
  } catch {
    return null;
  }
}

function normalizeMobileManifestDocument(
  value: unknown,
  expectedProjectId?: string,
): MobileManifest | null {
  if (!isObject(value) || value.schema !== MOBILE_MANIFEST_SCHEMA) return null;

  const projectId = normalizedText(value.projectId);
  if (!projectId || (expectedProjectId && projectId !== expectedProjectId)) return null;

  const screens = normalizeMobileScreenRecords(value.screens);
  if (screens.length === 0 || screens.length > MOBILE_MAX_SCREENS) return null;

  const editor = normalizeMobileEditorState(value.editor);
  if (!editor) return null;

  const requestedSelection = value.selectedScreenId == null
    ? null
    : normalizedText(value.selectedScreenId);
  const selectedScreenId = requestedSelection && screens.some((screen) => screen.id === requestedSelection)
    ? requestedSelection
    : null;

  return {
    schema: MOBILE_MANIFEST_SCHEMA,
    projectId,
    screens,
    editor,
    selectedScreenId,
    updatedAt: normalizedNonNegativeNumber(value.updatedAt) ?? 0,
  };
}

export type MobileScreenMutationAction =
  | 'created'
  | 'updated'
  | 'renamed'
  | 'duplicated'
  | 'reordered'
  | 'deleted';

export interface MobileScreenMutationMetadata {
  projectId: string;
  screens: Array<{
    id: string;
    file: string;
    name: string;
    action: MobileScreenMutationAction;
  }>;
  selectedScreenId?: string | null;
  manifestUpdated: boolean;
}

export interface MobileScreenValidationIssue {
  code:
    | 'not-an-array'
    | 'empty'
    | 'too-many-screens'
    | 'invalid-screen'
    | 'duplicate-id'
    | 'duplicate-file'
    | 'overlapping-screens';
  message: string;
  index?: number;
}

export interface MobileScreenValidationResult {
  valid: boolean;
  records: MobileScreenRecord[];
  issues: MobileScreenValidationIssue[];
}

export interface ReconcileMobileScreenRecordsInput {
  records: readonly unknown[];
  availableFiles?: readonly string[];
}

export interface MobileScreenPlacement {
  x: number;
  y: number;
}

const MOBILE_DEFAULT_SCREEN_WIDTH = 390;
const MOBILE_DEFAULT_SCREEN_HEIGHT = 844;
const MOBILE_SCREEN_GRID_GAP = 80;

const MOBILE_ORIENTATIONS: readonly MobileOrientation[] = ['portrait', 'landscape'];
const MOBILE_DEVICE_FRAMES: readonly MobileDeviceFrame[] = [
  'generic-phone',
  'iphone',
  'android',
  'tablet',
];
const MOBILE_TRANSITIONS: readonly MobileTransition[] = [
  'none',
  'fade',
  'slide-left',
  'slide-right',
  'modal',
];

/**
 * Returns true for a canonical, project-relative user-facing HTML path.
 * Internal dot-directories, traversal segments, URL-like paths, and platform
 * specific absolute paths are deliberately excluded.
 */
export function isSafeMobileScreenPath(value: unknown): value is string {
  return normalizeMobileScreenPath(value) !== null;
}

/**
 * Normalizes a screen record without consulting the filesystem or the clock.
 * Invalid records return null so callers can discard them during recovery.
 */
export function normalizeMobileScreenRecord(value: unknown): MobileScreenRecord | null {
  if (!isObject(value)) return null;

  const id = normalizedText(value.id);
  const file = normalizeMobileScreenPath(value.file);
  const name = normalizedText(value.name);
  const order = normalizedNonNegativeInteger(value.order);
  const x = normalizedFiniteNumber(value.x);
  const y = normalizedFiniteNumber(value.y);
  const width = normalizedPositiveNumber(value.width);
  const height = normalizedPositiveNumber(value.height);
  const orientation = oneOf(MOBILE_ORIENTATIONS, value.orientation);
  const deviceFrame = oneOf(MOBILE_DEVICE_FRAMES, value.deviceFrame);
  const createdAt = normalizedNonNegativeNumber(value.createdAt);
  const updatedAt = normalizedNonNegativeNumber(value.updatedAt);

  if (
    !id ||
    !file ||
    !name ||
    order === null ||
    x === null ||
    y === null ||
    width === null ||
    height === null ||
    !orientation ||
    !deviceFrame ||
    createdAt === null ||
    updatedAt === null
  ) {
    return null;
  }

  const transition = value.transition === undefined
    ? undefined
    : oneOf(MOBILE_TRANSITIONS, value.transition);
  if (value.transition !== undefined && !transition) return null;

  const routeKey = value.routeKey === undefined ? undefined : normalizedText(value.routeKey);
  if (value.routeKey !== undefined && !routeKey) return null;

  return {
    id,
    file,
    name,
    order,
    x,
    y,
    width,
    height,
    orientation,
    deviceFrame,
    ...(transition === undefined || transition === null ? {} : { transition }),
    ...(routeKey === undefined || routeKey === null ? {} : { routeKey }),
    createdAt,
    updatedAt,
  };
}

/** Normalizes every valid record in an unknown input array. */
export function normalizeMobileScreenRecords(value: unknown): MobileScreenRecord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((record) => normalizeMobileScreenRecord(record))
    .filter((record): record is MobileScreenRecord => record !== null);
}

/**
 * Validates the complete screen collection, including collection-level
 * invariants that cannot be checked on one record in isolation.
 */
export function validateMobileScreenRecords(value: unknown): MobileScreenValidationResult {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      records: [],
      issues: [{ code: 'not-an-array', message: 'Mobile screens must be an array.' }],
    };
  }

  const records: MobileScreenRecord[] = [];
  const issues: MobileScreenValidationIssue[] = [];

  if (value.length === 0) {
    issues.push({ code: 'empty', message: 'A mobile project must contain at least one screen.' });
  }
  if (value.length > MOBILE_MAX_SCREENS) {
    issues.push({
      code: 'too-many-screens',
      message: `A mobile project may contain at most ${MOBILE_MAX_SCREENS} screens.`,
    });
  }

  const ids = new Map<string, number>();
  const files = new Map<string, number>();

  value.forEach((candidate, index) => {
    const record = normalizeMobileScreenRecord(candidate);
    if (!record) {
      issues.push({
        code: 'invalid-screen',
        index,
        message: `Mobile screen at index ${index} is invalid.`,
      });
      return;
    }

    records.push(record);

    const previousId = ids.get(record.id);
    if (previousId !== undefined) {
      issues.push({
        code: 'duplicate-id',
        index,
        message: `Mobile screen id "${record.id}" is duplicated at indexes ${previousId} and ${index}.`,
      });
    } else {
      ids.set(record.id, index);
    }

    const previousFile = files.get(record.file);
    if (previousFile !== undefined) {
      issues.push({
        code: 'duplicate-file',
        index,
        message: `Mobile screen file "${record.file}" is duplicated at indexes ${previousFile} and ${index}.`,
      });
    } else {
      files.set(record.file, index);
    }
  });

  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];
    if (!current) continue;
    for (let otherIndex = index + 1; otherIndex < records.length; otherIndex += 1) {
      const other = records[otherIndex];
      if (other && mobileScreenRecordsOverlap(current, other)) {
        issues.push({
          code: 'overlapping-screens',
          index: otherIndex,
          message: `Mobile screens "${current.id}" and "${other.id}" overlap on the canvas.`,
        });
      }
    }
  }

  return { valid: issues.length === 0, records, issues };
}

/** Returns whether two screen rectangles occupy any common area. */
export function mobileScreenRecordsOverlap(
  first: Pick<MobileScreenRecord, 'x' | 'y' | 'width' | 'height'>,
  second: Pick<MobileScreenRecord, 'x' | 'y' | 'width' | 'height'>,
): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

/** Returns whether any pair of records overlaps on the canvas. */
export function hasOverlappingMobileScreenRecords(records: readonly MobileScreenRecord[]): boolean {
  for (let index = 0; index < records.length; index += 1) {
    const current = records[index];
    if (!current) continue;
    for (let otherIndex = index + 1; otherIndex < records.length; otherIndex += 1) {
      const other = records[otherIndex];
      if (other && mobileScreenRecordsOverlap(current, other)) return true;
    }
  }
  return false;
}

/**
 * Drops malformed/stale/duplicate records and moves colliding screens to the
 * first free deterministic grid slot. When records are unavailable, valid
 * HTML paths can seed replacement records for manifest recovery.
 */
export function reconcileMobileScreenRecords(
  input: readonly unknown[] | ReconcileMobileScreenRecordsInput,
  availableFiles?: readonly string[],
): MobileScreenRecord[] {
  const recordsInput: readonly unknown[] = 'records' in input ? input.records : input;
  const filesInput: readonly string[] | undefined = 'records' in input ? input.availableFiles : availableFiles;
  const available = filesInput === undefined
    ? undefined
    : new Set(
        filesInput
          .map((file) => normalizeMobileScreenPath(file))
          .filter((file): file is string => file !== null),
      );

  const seenIds = new Set<string>();
  const seenFiles = new Set<string>();
  const reconciled: MobileScreenRecord[] = [];

  for (const candidate of recordsInput) {
    const record = normalizeMobileScreenRecord(candidate);
    if (!record) continue;
    if (available && !available.has(record.file)) continue;
    if (seenIds.has(record.id) || seenFiles.has(record.file)) continue;

    const placed = reconciled.some((existing) => mobileScreenRecordsOverlap(existing, record))
      ? { ...record, ...findAvailableMobileScreenPosition(record, reconciled) }
      : record;

    seenIds.add(placed.id);
    seenFiles.add(placed.file);
    reconciled.push(placed);
    if (reconciled.length >= MOBILE_MAX_SCREENS) break;
  }

  if (available === undefined) return reconciled;

  for (const file of available) {
    if (reconciled.length >= MOBILE_MAX_SCREENS) break;
    if (seenFiles.has(file)) continue;
    const id = mobileScreenIdForFile(file, seenIds);
    const position = findAvailableMobileScreenPosition(
      { width: MOBILE_DEFAULT_SCREEN_WIDTH, height: MOBILE_DEFAULT_SCREEN_HEIGHT },
      reconciled,
    );
    const record: MobileScreenRecord = {
      id,
      file,
      name: mobileScreenNameForFile(file),
      order: reconciled.length,
      ...position,
      width: MOBILE_DEFAULT_SCREEN_WIDTH,
      height: MOBILE_DEFAULT_SCREEN_HEIGHT,
      orientation: 'portrait',
      deviceFrame: 'generic-phone',
      createdAt: 0,
      updatedAt: 0,
    };
    seenIds.add(id);
    seenFiles.add(file);
    reconciled.push(record);
  }

  return reconciled;
}

/** Finds the first row-major grid position that does not overlap a record. */
export function findAvailableMobileScreenPosition(
  record: Pick<MobileScreenRecord, 'width' | 'height'>,
  existing: readonly MobileScreenRecord[],
): MobileScreenPlacement {
  const maxWidth = Math.max(
    MOBILE_DEFAULT_SCREEN_WIDTH,
    record.width,
    ...existing.map((screen) => screen.width),
  );
  const maxHeight = Math.max(
    MOBILE_DEFAULT_SCREEN_HEIGHT,
    record.height,
    ...existing.map((screen) => screen.height),
  );
  const stepX = maxWidth + MOBILE_SCREEN_GRID_GAP;
  const stepY = maxHeight + MOBILE_SCREEN_GRID_GAP;

  for (let row = 0; ; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      const position = { x: column * stepX, y: row * stepY };
      const candidate = { ...record, ...position };
      if (!existing.some((screen) => mobileScreenRecordsOverlap(candidate, screen))) {
        return position;
      }
    }
  }
}

function normalizeMobileScreenPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('\\') || trimmed.includes('\0')) return null;
  if (trimmed.startsWith('/') || /^[A-Za-z]:/.test(trimmed)) return null;
  if (trimmed.includes('?') || trimmed.includes('#')) return null;

  const withoutLeadingDot = trimmed.replace(/^(?:\.\/)+/, '');
  const segments = withoutLeadingDot.split('/');
  if (
    segments.length === 0 ||
    segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.startsWith('.'))
  ) {
    return null;
  }
  if (!/\.html$/i.test(segments[segments.length - 1] ?? '')) return null;
  if (segments.some((segment) => /[\u0000-\u001f\u007f]/.test(segment))) return null;
  return segments.join('/');
}

function normalizedText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizedFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizedNonNegativeNumber(value: unknown): number | null {
  const number = normalizedFiniteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

function normalizeMobileEditorState(value: unknown): MobileEditorState | null {
  if (!isObject(value)) return null;
  const x = normalizedFiniteNumber(value.x);
  const y = normalizedFiniteNumber(value.y);
  const zoom = normalizedPositiveNumber(value.zoom);
  if (x === null || y === null || zoom === null) return null;
  return { x, y, zoom };
}

function normalizedPositiveNumber(value: unknown): number | null {
  const number = normalizedFiniteNumber(value);
  return number !== null && number > 0 ? number : null;
}

function normalizedNonNegativeInteger(value: unknown): number | null {
  const number = normalizedNonNegativeNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function oneOf<const T extends readonly string[]>(values: T, value: unknown): T[number] | null {
  return typeof value === 'string' && values.includes(value) ? value as T[number] : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mobileScreenIdForFile(file: string, usedIds: ReadonlySet<string>): string {
  const slug = file
    .replace(/\.html$/i, '')
    .split('/')
    .join('-')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'screen';
  const base = `screen-${slug}`;
  if (!usedIds.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!usedIds.has(candidate)) return candidate;
  }
}

function mobileScreenNameForFile(file: string): string {
  const basename = file.split('/').pop()?.replace(/\.html$/i, '') ?? 'Screen';
  const words = basename.replace(/[-_]+/g, ' ').trim();
  return words ? words.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Screen';
}
