// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MOBILE_MANIFEST_FILE,
  MOBILE_MAX_SCREENS,
  type MobileEditorMetadata,
} from '@open-design/contracts';

import { MobileCanvasEditor } from '../../src/components/MobileCanvasEditor';
import { fetchProjectFileText } from '../../src/providers/registry';
import type { ProjectFile } from '../../src/types';

vi.mock('../../src/providers/registry', async () => {
  const actual = await vi.importActual<typeof import('../../src/providers/registry')>(
    '../../src/providers/registry',
  );
  return {
    ...actual,
    fetchProjectFileText: vi.fn().mockResolvedValue('<html><body><h1>Home</h1></body></html>'),
    writeProjectTextFile: vi.fn().mockResolvedValue({ name: 'manifest.json' }),
  };

  it('hydrates screen selection and editor state from the canonical manifest file', async () => {
    vi.mocked(fetchProjectFileText).mockImplementation(async (_projectId, name) => (
      name === MOBILE_MANIFEST_FILE
        ? JSON.stringify({
            schema: 'open-design.mobile-manifest.v1',
            projectId: 'project-mobile-canonical',
            screens: [{
              ...metadata.screens[0],
              id: 'detail',
              file: 'screens/detail.html',
              name: 'Detail',
            }],
            editor: { x: 72, y: 80, zoom: 0.66 },
            selectedScreenId: 'detail',
            updatedAt: 2,
          })
        : '<html><body><h1>Detail</h1></body></html>'
    ));

    render(
      <MobileCanvasEditor
        projectId="project-mobile-canonical"
        files={[file, { ...file, name: 'screens/detail.html', path: 'screens/detail.html' }]}
        metadata={metadata}
      />,
    );

    const detailButton = await screen.findByRole('button', {
      name: /Detail\s+screens\/detail\.html/,
    });
    expect(detailButton).toHaveClass('selected');

    await waitFor(() => {
      expect(
        screen.getByTestId('mobile-canvas-editor').querySelector('[data-screen-id="detail"]'),
      ).toHaveClass('selected');
    });
  });
});

vi.mock('../../src/runtime/srcdoc', () => ({
  buildSrcdoc: (html: string) => html,
}));

const file: ProjectFile = {
  name: 'screens/home.html',
  path: 'screens/home.html',
  type: 'file',
  size: 100,
  mtime: 1,
  kind: 'html',
  mime: 'text/html',
};

const metadata: MobileEditorMetadata = {
  schemaVersion: 1,
  manifestFile: MOBILE_MANIFEST_FILE,
  screens: [{
    id: 'home',
    file: file.name,
    name: 'Home',
    order: 0,
    x: 40,
    y: 40,
    width: 390,
    height: 844,
    orientation: 'portrait',
    deviceFrame: 'generic-phone',
    createdAt: 1,
    updatedAt: 1,
  }],
  editor: { x: 36, y: 36, zoom: 0.72 },
  selectedScreenId: 'home',
  maxScreens: MOBILE_MAX_SCREENS,
  updatedAt: 1,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MobileCanvasEditor', () => {
  it('keeps only the orientation control and updates the frame immediately', async () => {
    const onManifestChange = vi.fn();
    render(
      <MobileCanvasEditor
        projectId="project-mobile"
        files={[file]}
        metadata={metadata}
        onManifestChange={onManifestChange}
      />,
    );

    const frame = await screen.findByRole('article');
    expect(frame).toHaveAttribute('data-device-frame', 'generic-phone');

    const selects = frame.closest('section')?.querySelectorAll('select');
    expect(selects).toHaveLength(1);
    const orientationSelect = selects?.[0];
    if (!(orientationSelect instanceof HTMLSelectElement)) throw new Error('orientation selector not rendered');
    fireEvent.change(orientationSelect, { target: { value: 'landscape' } });

    await waitFor(() => expect(frame).toHaveStyle({ width: '868px' }));
    expect(onManifestChange).toHaveBeenCalledWith(expect.objectContaining({
      screens: [expect.objectContaining({ orientation: 'landscape', width: 844, height: 390 })],
    }));
  });

  it('does not persist every pointer move while panning, then commits once on release', async () => {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { value: vi.fn(), configurable: true });
    const onManifestChange = vi.fn();
    render(
      <MobileCanvasEditor
        projectId="project-mobile-pan"
        files={[file]}
        metadata={metadata}
        onManifestChange={onManifestChange}
      />,
    );

    const viewport = await screen.findByTestId('mobile-canvas-editor').then((root) => {
      const element = root.querySelector('.mobile-canvas-viewport');
      if (!(element instanceof HTMLElement)) throw new Error('canvas viewport not rendered');
      return element;
    });
    const beforePan = onManifestChange.mock.calls.length;

    fireEvent.pointerDown(viewport, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 120, clientY: 115, pointerId: 1 });
    fireEvent.pointerMove(viewport, { clientX: 140, clientY: 130, pointerId: 1 });
    expect(onManifestChange).toHaveBeenCalledTimes(beforePan);

    fireEvent.pointerUp(viewport, { clientX: 140, clientY: 130, pointerId: 1 });
    await waitFor(() => expect(onManifestChange).toHaveBeenCalledTimes(beforePan + 1));
  });
});
