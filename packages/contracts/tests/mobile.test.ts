import { describe, expect, it } from 'vitest';
import {
  MOBILE_MANIFEST_FILE,
  MOBILE_MANIFEST_SCHEMA,
  findAvailableMobileScreenPosition,
  hasOverlappingMobileScreenRecords,
  reconcileMobileScreenRecords,
  validateMobileScreenRecords,
  type MobileScreenRecord,
} from '../src/api/mobile.js';

function screen(overrides: Partial<MobileScreenRecord> = {}): MobileScreenRecord {
  return {
    id: 'home',
    file: 'screens/home.html',
    name: 'Home',
    order: 0,
    x: 0,
    y: 0,
    width: 390,
    height: 844,
    orientation: 'portrait',
    deviceFrame: 'generic-phone',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('mobile screen manifest contract', () => {
  it('keeps the manifest schema and rejects overlap', () => {
    const result = validateMobileScreenRecords([screen(), screen({ id: 'detail', file: 'screens/detail.html' })]);
    expect(MOBILE_MANIFEST_SCHEMA).toBe('open-design.mobile-manifest.v1');
    expect(MOBILE_MANIFEST_FILE).toBe('.od/mobile-manifest.json');
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'overlapping-screens')).toBe(true);
    expect(hasOverlappingMobileScreenRecords(result.records)).toBe(true);
  });

  it('repairs missing files, duplicates, and collisions deterministically', () => {
    const records = reconcileMobileScreenRecords(
      {
        records: [
          screen(),
          screen({ id: 'detail', file: 'screens/detail.html' }),
          screen({ id: 'external', file: 'screens/missing.html' }),
        ],
        availableFiles: ['screens/home.html', 'screens/detail.html', 'screens/settings.html'],
      },
    );
    expect(records.map((item) => item.file)).toEqual(['screens/home.html', 'screens/detail.html', 'screens/settings.html']);
    expect(new Set(records.map((item) => item.id)).size).toBe(records.length);
    expect(hasOverlappingMobileScreenRecords(records)).toBe(false);
  });

  it('places a new record outside existing screen rectangles', () => {
    const existing = [screen()];
    const position = findAvailableMobileScreenPosition({ width: 390, height: 844 }, existing);
    expect(position).toEqual({ x: 0, y: 924 });
  });
});
