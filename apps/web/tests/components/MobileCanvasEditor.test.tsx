// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MOBILE_MANIFEST_FILE,
  MOBILE_MAX_SCREENS,
  type MobileEditorMetadata,
} from '@open-design/contracts';

import { MobileCanvasEditor } from '../../src/components/MobileCanvasEditor';
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
  it('renders the selected device frame immediately after changing the frame option', async () => {
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

    const deviceFrameSelect = frame.closest('section')?.querySelector('select');
    if (!(deviceFrameSelect instanceof HTMLSelectElement)) throw new Error('device frame selector not rendered');
    fireEvent.change(deviceFrameSelect, { target: { value: 'iphone' } });

    await waitFor(() => expect(frame).toHaveAttribute('data-device-frame', 'iphone'));
    expect(onManifestChange).toHaveBeenCalledWith(expect.objectContaining({
      screens: [expect.objectContaining({ deviceFrame: 'iphone' })],
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
