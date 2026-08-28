import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import type {
  ProjectFile,
  WorkspaceCollabContext,
  WorkspaceContextItem,
} from '@open-design/contracts';
import {
  deleteProjectFile,
  fetchProjectFileText,
  projectRawUrl,
  writeProjectTextFile,
} from '../providers/registry';
import { Icon } from './Icon';
import {
  createMobileScreenManifest,
  DEFAULT_MOBILE_SCREEN_HEIGHT,
  DEFAULT_MOBILE_SCREEN_WIDTH,
  defaultMobileScreenPosition,
  isMobileScreenPath,
  MOBILE_SCREEN_MANIFEST_PATH,
  MOBILE_SCREEN_LEGACY_MANIFEST_PATH,
  mobileScreenNameFromPath,
  parseMobileScreenManifest,
  serializeMobileScreenManifest,
  slugifyMobileScreenName,
  starterMobileScreenHtml,
} from '../mobile/mobile-screens';
import type { MobileScreen, MobileScreenManifest } from '../mobile/mobile-screens';

const ACTIVE_MOBILE_SCREEN_KEY_PREFIX = 'open-design.mobile-active-screen:';

type MobileScreenCanvasProps = {
  projectId: string;
  files: ProjectFile[];
  viewerOnly: boolean;
  workspaceContext?: WorkspaceCollabContext | null;
  onRefreshFiles: (options?: { fresh?: boolean }) => Promise<ProjectFile[]>;
  onActiveContextChange: (next: WorkspaceContextItem | null) => void;
  onWorkspaceContextsChange: (next: WorkspaceContextItem[]) => void;
  focusMode: boolean;
  onFocusModeChange: (focused: boolean) => void;
};

type Point = { x: number; y: number };
type DragState =
  | { kind: 'pan'; pointerX: number; pointerY: number; panX: number; panY: number }
  | { kind: 'screen'; id: string; pointerX: number; pointerY: number; x: number; y: number }
  | null;

function screenIdForPath(path: string): string {
  let hash = 2166136261;
  for (const character of path) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `screen-${(hash >>> 0).toString(16)}`;
}

function fileForScreen(files: ProjectFile[], screen: MobileScreen): ProjectFile | undefined {
  return files.find((file) => file.name === screen.path);
}

function contextForScreen(screen: MobileScreen): WorkspaceContextItem {
  return {
    id: `mobile-screen:${screen.id}`,
    kind: 'mobile-screen',
    label: screen.name,
    path: screen.path,
    tabId: screen.path,
    title: `${screen.name} · Mobile screen`,
  };
}

function screenFromDiscoveredFile(file: ProjectFile, index: number): MobileScreen {
  const position = defaultMobileScreenPosition(index);
  return {
    id: screenIdForPath(file.name),
    name: mobileScreenNameFromPath(file.name),
    path: file.name,
    width: DEFAULT_MOBILE_SCREEN_WIDTH,
    height: DEFAULT_MOBILE_SCREEN_HEIGHT,
    x: position.x,
    y: position.y,
  };
}

export function MobileScreenCanvas({
  projectId,
  files,
  viewerOnly,
  workspaceContext = null,
  onRefreshFiles,
  onActiveContextChange,
  onWorkspaceContextsChange,
  focusMode,
  onFocusModeChange,
}: MobileScreenCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>(null);
  const manifestRef = useRef<MobileScreenManifest | null>(null);
  const [manifest, setManifest] = useState<MobileScreenManifest | null>(null);
  const [manifestLoaded, setManifestLoaded] = useState(false);
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState<Point>({ x: 56, y: 40 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discoveredFiles = useMemo(
    () => files.filter((file) => isMobileScreenPath(file.name)),
    [files],
  );
  const screens = useMemo(() => {
    const knownByPath = new Map((manifest?.screens ?? []).map((screen) => [screen.path, screen]));
    const known = (manifest?.screens ?? []).filter((screen) => discoveredFiles.some((file) => file.name === screen.path));
    const newScreens = discoveredFiles
      .filter((file) => !knownByPath.has(file.name))
      .map((file, index) => screenFromDiscoveredFile(file, known.length + index));
    return [...known, ...newScreens];
  }, [discoveredFiles, manifest]);
  const activeScreen = screens.find((screen) => screen.id === activeScreenId) ?? null;

  const writeManifest = useCallback(async (nextScreens: MobileScreen[]) => {
    const next = createMobileScreenManifest(projectId, nextScreens, {
      editor: { x: pan.x, y: pan.y, zoom },
      selectedScreenId: activeScreenId,
    });
    const saved = await writeProjectTextFile(
      projectId,
      MOBILE_SCREEN_MANIFEST_PATH,
      serializeMobileScreenManifest(next),
      undefined,
      workspaceContext,
    );
    if (!saved) throw new Error('Could not save the mobile screen manifest');
    manifestRef.current = next;
    setManifest(next);
  }, [activeScreenId, pan.x, pan.y, projectId, workspaceContext, zoom]);

  useEffect(() => {
    let cancelled = false;
    setManifestLoaded(false);
    void fetchProjectFileText(projectId, MOBILE_SCREEN_MANIFEST_PATH, {
      cache: 'no-store',
      workspaceContext,
    }).then(async (text) => {
      if (cancelled) return;
      const legacyText = text == null
        ? await fetchProjectFileText(projectId, MOBILE_SCREEN_LEGACY_MANIFEST_PATH, {
            cache: 'no-store',
            workspaceContext,
          })
        : null;
      if (cancelled) return;
      const parsed = parseMobileScreenManifest(text ?? legacyText);
      manifestRef.current = parsed;
      setManifest(parsed);
      if (parsed?.editor) {
        setPan({ x: parsed.editor.x, y: parsed.editor.y });
        setZoom(parsed.editor.zoom);
      }
      setManifestLoaded(true);
    });
    return () => { cancelled = true; };
  }, [projectId, workspaceContext, files.map((file) => `${file.name}:${file.mtime}`).join('|')]);

  useEffect(() => {
    if (!manifestLoaded || viewerOnly || manifest || discoveredFiles.length === 0) return;
    void writeManifest(screens).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Could not save screen metadata');
    });
  }, [discoveredFiles.length, manifest, manifestLoaded, screens, viewerOnly, writeManifest]);

  useEffect(() => {
    const storageKey = `${ACTIVE_MOBILE_SCREEN_KEY_PREFIX}${projectId}`;
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(storageKey); } catch { /* ignore */ }
    const persistedId = manifest?.selectedScreenId ?? null;
    const nextId = stored && screens.some((screen) => screen.id === stored)
      ? stored
      : persistedId && screens.some((screen) => screen.id === persistedId)
        ? persistedId
        : screens[0]?.id ?? null;
    setActiveScreenId(nextId);
  }, [projectId, screens]);

  useEffect(() => {
    // Keep the active screen as the sole implicit workspace context. Listing
    // every screen here would make the agent see several equally weighted
    // `mobile-screen` targets, defeating the single-selection contract.
    onWorkspaceContextsChange([]);
    const context = activeScreen ? contextForScreen(activeScreen) : null;
    onActiveContextChange(context);
  }, [activeScreen, onActiveContextChange, onWorkspaceContextsChange]);

  const selectScreen = useCallback((screen: MobileScreen) => {
    setActiveScreenId(screen.id);
    try { window.localStorage.setItem(`${ACTIVE_MOBILE_SCREEN_KEY_PREFIX}${projectId}`, screen.id); } catch { /* ignore */ }
    onActiveContextChange(contextForScreen(screen));
  }, [onActiveContextChange, projectId]);

  const updateScreens = useCallback((nextScreens: MobileScreen[]) => {
    const next = createMobileScreenManifest(projectId, nextScreens, {
      editor: { x: pan.x, y: pan.y, zoom },
      selectedScreenId: activeScreenId,
    });
    manifestRef.current = next;
    setManifest(next);
    return nextScreens;
  }, [activeScreenId, pan.x, pan.y, projectId, zoom]);

  const handleCanvasPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    dragRef.current = {
      kind: 'pan',
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [pan]);

  const handleScreenPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>, screen: MobileScreen) => {
    event.stopPropagation();
    selectScreen(screen);
    dragRef.current = {
      kind: 'screen',
      id: screen.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: screen.x,
      y: screen.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [selectScreen]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === 'pan') {
      setPan({
        x: drag.panX + event.clientX - drag.pointerX,
        y: drag.panY + event.clientY - drag.pointerY,
      });
      return;
    }
    const dx = (event.clientX - drag.pointerX) / zoom;
    const dy = (event.clientY - drag.pointerY) / zoom;
    updateScreens(screens.map((screen) => (
      screen.id === drag.id ? { ...screen, x: drag.x + dx, y: drag.y + dy } : screen
    )));
  }, [screens, updateScreens, zoom]);

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind === 'screen' && !viewerOnly) {
      void writeManifest(manifestRef.current?.screens ?? screens).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Could not save screen position');
      });
    }
  }, [screens, viewerOnly, writeManifest]);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoom((current) => Math.min(1.5, Math.max(0.35, current * (event.deltaY < 0 ? 1.08 : 0.92))));
  }, []);

  const fitAll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || screens.length === 0) return;
    const minX = Math.min(...screens.map((screen) => screen.x));
    const minY = Math.min(...screens.map((screen) => screen.y));
    const maxX = Math.max(...screens.map((screen) => screen.x + screen.width));
    const maxY = Math.max(...screens.map((screen) => screen.y + screen.height));
    const availableWidth = Math.max(320, viewport.clientWidth - 96);
    const availableHeight = Math.max(320, viewport.clientHeight - 96);
    const nextZoom = Math.min(1.2, Math.max(0.35, Math.min(availableWidth / (maxX - minX), availableHeight / (maxY - minY))));
    setZoom(nextZoom);
    setPan({
      x: (viewport.clientWidth - (maxX - minX) * nextZoom) / 2 - minX * nextZoom,
      y: (viewport.clientHeight - (maxY - minY) * nextZoom) / 2 - minY * nextZoom,
    });
  }, [screens]);

  const runMutation = useCallback(async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      await onRefreshFiles({ fresh: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update screens');
    } finally {
      setBusy(false);
    }
  }, [onRefreshFiles]);

  const addScreen = useCallback(() => {
    if (viewerOnly) return;
    const entered = window.prompt('Screen name', `Screen ${screens.length + 1}`);
    const name = entered?.trim();
    if (!name) return;
    const id = `screen-${Date.now().toString(36)}`;
    const basePath = `screens/${slugifyMobileScreenName(name)}`;
    const path = `${basePath}-${id.slice(-6)}.html`;
    const nextScreen: MobileScreen = {
      id,
      name,
      path,
      width: DEFAULT_MOBILE_SCREEN_WIDTH,
      height: DEFAULT_MOBILE_SCREEN_HEIGHT,
      ...defaultMobileScreenPosition(screens.length),
    };
    void runMutation(async () => {
      const file = await writeProjectTextFile(projectId, path, starterMobileScreenHtml(name), undefined, workspaceContext);
      if (!file) throw new Error('Could not create the screen');
      await writeManifest([...screens, nextScreen]);
      selectScreen(nextScreen);
    });
  }, [projectId, runMutation, screens, selectScreen, viewerOnly, workspaceContext, writeManifest]);

  const renameScreen = useCallback((screen: MobileScreen) => {
    if (viewerOnly) return;
    const entered = window.prompt('Screen name', screen.name);
    const name = entered?.trim();
    if (!name || name === screen.name) return;
    void runMutation(() => writeManifest(screens.map((candidate) => (
      candidate.id === screen.id ? { ...candidate, name } : candidate
    ))).then(() => undefined));
  }, [runMutation, screens, viewerOnly, writeManifest]);

  const duplicateScreen = useCallback((screen: MobileScreen) => {
    if (viewerOnly) return;
    void runMutation(async () => {
      const source = await fetchProjectFileText(projectId, screen.path, { cache: 'no-store', workspaceContext });
      if (source == null) throw new Error('Could not read the screen to duplicate');
      const id = `screen-${Date.now().toString(36)}`;
      const path = `screens/${slugifyMobileScreenName(`${screen.name} copy`)}-${id.slice(-6)}.html`;
      const file = await writeProjectTextFile(projectId, path, source, undefined, workspaceContext);
      if (!file) throw new Error('Could not duplicate the screen');
      const nextScreen = { ...screen, id, name: `${screen.name} copy`, path, x: screen.x + 48, y: screen.y + 48 };
      await writeManifest([...screens, nextScreen]);
      selectScreen(nextScreen);
    });
  }, [projectId, runMutation, screens, selectScreen, viewerOnly, workspaceContext, writeManifest]);

  const removeScreen = useCallback((screen: MobileScreen) => {
    if (viewerOnly) return;
    if (screens.length <= 1) {
      setError('A mobile project must keep at least one screen.');
      return;
    }
    if (!window.confirm(`Delete “${screen.name}”?`)) return;
    void runMutation(async () => {
      if (!await deleteProjectFile(projectId, screen.path, workspaceContext)) throw new Error('Could not delete the screen');
      const nextScreens = screens.filter((candidate) => candidate.id !== screen.id);
      await writeManifest(nextScreens);
      if (activeScreenId === screen.id) {
        const nextActive = nextScreens[0];
        if (nextActive) selectScreen(nextActive);
        else {
          setActiveScreenId(null);
          onActiveContextChange(null);
        }
      }
    });
  }, [activeScreenId, onActiveContextChange, projectId, runMutation, screens, selectScreen, viewerOnly, workspaceContext, writeManifest]);

  return (
    <section className="workspace mobile-screen-canvas" data-testid="mobile-screen-canvas">
      <header className="mobile-screen-canvas__toolbar">
        <div className="mobile-screen-canvas__title">
          <span className="mobile-screen-canvas__eyebrow">Mobile canvas</span>
          <span className="mobile-screen-canvas__active">
            {activeScreen ? `Editing: ${activeScreen.name}` : 'Select a screen to edit'}
          </span>
        </div>
        <div className="mobile-screen-canvas__actions">
          <span className="mobile-screen-canvas__count">{screens.length} {screens.length === 1 ? 'screen' : 'screens'}</span>
          <button type="button" className="ws-tab-action" onClick={() => setZoom((current) => Math.max(0.35, current - 0.1))} aria-label="Zoom out">−</button>
          <span className="mobile-screen-canvas__zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" className="ws-tab-action" onClick={() => setZoom((current) => Math.min(1.5, current + 0.1))} aria-label="Zoom in">+</button>
          <button type="button" className="ws-tab-action" onClick={fitAll} disabled={screens.length === 0}>Fit all</button>
          <button type="button" className="ws-tab-action" onClick={() => onFocusModeChange(!focusMode)}>{focusMode ? 'Show chat' : 'Focus'}</button>
          <button type="button" className="ws-tab-action share" onClick={addScreen} disabled={viewerOnly || busy}>
            <Icon name="plus" size={13} /> New screen
          </button>
        </div>
      </header>
      {error ? <div className="mobile-screen-canvas__error" role="alert">{error}</div> : null}
      <div
        ref={viewportRef}
        className="mobile-screen-canvas__viewport"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="mobile-screen-canvas__world"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          onPointerDown={handleCanvasPointerDown}
        >
          {screens.map((screen) => {
            const file = fileForScreen(files, screen);
            const selected = screen.id === activeScreenId;
            return (
              <article
                key={screen.id}
                className={`mobile-screen-card${selected ? ' is-active' : ''}`}
                style={{ left: screen.x, top: screen.y, width: screen.width, height: screen.height + 34 }}
                onPointerDown={(event) => handleScreenPointerDown(event, screen)}
                data-testid={`mobile-screen-${screen.id}`}
              >
                <div className="mobile-screen-card__chrome">
                  <span className="mobile-screen-card__name">{screen.name}</span>
                  <div className="mobile-screen-card__actions">
                    <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => renameScreen(screen)} aria-label={`Rename ${screen.name}`} disabled={viewerOnly}><Icon name="edit" size={12} /></button>
                    <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => duplicateScreen(screen)} aria-label={`Duplicate ${screen.name}`} disabled={viewerOnly}><Icon name="copy" size={12} /></button>
                    <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => removeScreen(screen)} aria-label={`Delete ${screen.name}`} disabled={viewerOnly}><Icon name="trash" size={12} /></button>
                  </div>
                </div>
                <div className="mobile-screen-card__device">
                  <div className="mobile-screen-card__island" aria-hidden />
                  {file ? (
                    <iframe
                      title={screen.name}
                      src={`${projectRawUrl(projectId, screen.path)}?v=${file.mtime}`}
                      sandbox="allow-scripts"
                      className="mobile-screen-card__preview"
                    />
                  ) : (
                    <div className="mobile-screen-card__missing">Waiting for {screen.path}</div>
                  )}
                  <div className="mobile-screen-card__home" aria-hidden />
                </div>
              </article>
            );
          })}
        </div>
        {screens.length === 0 ? (
          <div className="mobile-screen-canvas__empty">
            <div className="mobile-screen-canvas__empty-icon"><Icon name="smartphone" size={22} /></div>
            <h2>No mobile screens yet</h2>
            <p>Create a screen or ask the agent to generate an onboarding flow.</p>
            <button type="button" className="ws-tab-action share" onClick={addScreen} disabled={viewerOnly || busy}>Create first screen</button>
          </div>
        ) : null}
        <div className="mobile-screen-canvas__hint">Drag to pan · Scroll to zoom · Click a screen to make it the agent’s target</div>
      </div>
    </section>
  );
}
