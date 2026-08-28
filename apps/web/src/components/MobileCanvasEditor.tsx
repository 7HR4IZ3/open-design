import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type {
  MobileEditorMetadata,
  MobileManifest,
  MobileScreenRecord,
  ProjectMetadata,
  WorkspaceCollabContext,
} from '@open-design/contracts';
import {
  MOBILE_MANIFEST_FILE,
  MOBILE_MANIFEST_SCHEMA,
  MOBILE_MAX_SCREENS,
  findAvailableMobileScreenPosition,
  mobileScreenRecordsOverlap,
  parseMobileManifest,
  reconcileMobileScreenRecords,
} from '@open-design/contracts';
import type { ProjectFile } from '../types';
import { hostedAuthRequired } from '../auth/supabase-browser';
import {
  deleteProjectFile,
  fetchProjectFileText,
  fetchProjectPreviewBaseHref,
  importProjectFigma,
  projectRawUrl,
  renameProjectFile,
  uploadProjectFile,
  writeProjectTextFile,
} from '../providers/registry';
import { downloadProjectArchive, exportProjectImageDataUrl } from '../runtime/exports';
import { buildSrcdoc } from '../runtime/srcdoc';
import { buildZip } from '../runtime/zip';
import { Icon } from './Icon';

const DEFAULT_EDITOR = { x: 36, y: 36, zoom: 0.72 };
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;
const MOBILE_GRID_SIZE = 8;
export const MOBILE_CANVAS_TAB = '__mobile_canvas__';

type CanvasInteractionMode = 'select' | 'pan';
type CanvasSize = { width: number; height: number };

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function snapCanvasPosition(value: number, enabled: boolean): number {
  return enabled ? Math.round(value / MOBILE_GRID_SIZE) * MOBILE_GRID_SIZE : value;
}

function mobileScreensBounds(screens: readonly MobileScreenRecord[]) {
  if (screens.length === 0) return { minX: 0, minY: 0, maxX: 390, maxY: 844 };
  return screens.reduce(
    (bounds, screen) => ({
      minX: Math.min(bounds.minX, screen.x),
      minY: Math.min(bounds.minY, screen.y),
      maxX: Math.max(bounds.maxX, screen.x + screen.width),
      maxY: Math.max(bounds.maxY, screen.y + screen.height),
    }),
    { minX: screens[0]!.x, minY: screens[0]!.y, maxX: screens[0]!.x + screens[0]!.width, maxY: screens[0]!.y + screens[0]!.height },
  );
}

function mobileViewportWorldBounds(editor: MobileEditorMetadata['editor'], size: CanvasSize) {
  const zoom = Math.max(editor.zoom, 0.01);
  return {
    minX: -editor.x / zoom,
    minY: -editor.y / zoom,
    maxX: (size.width - editor.x) / zoom,
    maxY: (size.height - editor.y) / zoom,
  };
}

export interface MobileCanvasEditorProps {
  projectId: string;
  files: ProjectFile[];
  metadata?: ProjectMetadata['mobileEditor'];
  workspaceContext?: WorkspaceCollabContext | null;
  viewerOnly?: boolean;
  selectedScreenId?: string | null;
  onSelectScreen?: (screen: MobileScreenRecord | null) => void;
  onManifestChange?: (metadata: MobileEditorMetadata) => void | Promise<void>;
  onOpenFile?: (name: string) => void;
  onOpenSourceFiles?: () => void;
  onRefreshFiles?: () => Promise<void> | void;
}

function now(): number {
  return Date.now();
}

function editorFocusedOnScreen(
  screen: MobileScreenRecord | null,
  editor: MobileEditorMetadata['editor'],
): MobileEditorMetadata['editor'] {
  if (!screen) return editor;
  return {
    ...editor,
    x: Math.max(24, 420 - screen.x * editor.zoom),
    y: Math.max(24, 220 - screen.y * editor.zoom),
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'screen';
}

function stableId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `screen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function screenSignature(metadata: MobileEditorMetadata | undefined): string {
  if (!metadata) return '';
  return JSON.stringify({
    screens: metadata.screens,
    editor: metadata.editor,
    selectedScreenId: metadata.selectedScreenId ?? null,
  });
}

function manifestFor(
  metadata: MobileEditorMetadata | undefined,
  screens: MobileScreenRecord[],
  selectedScreenId: string | null,
  editor = metadata?.editor ?? DEFAULT_EDITOR,
): MobileEditorMetadata {
  return {
    schemaVersion: 1,
    manifestFile: MOBILE_MANIFEST_FILE,
    screens,
    editor,
    selectedScreenId,
    maxScreens: MOBILE_MAX_SCREENS,
    updatedAt: now(),
  };
}

function manifestDocument(projectId: string, metadata: MobileEditorMetadata): string {
  const document: MobileManifest = {
    schema: MOBILE_MANIFEST_SCHEMA,
    projectId,
    screens: metadata.screens,
    editor: metadata.editor,
    selectedScreenId: metadata.selectedScreenId ?? null,
    updatedAt: metadata.updatedAt,
  };
  return `${JSON.stringify(document, null, 2)}\n`;
}

function htmlWithMobileRouteBridge(html: string, sourceScreenId: string): string {
  const script = `<script data-open-design-mobile-route-bridge>(function(){
    document.addEventListener('click', function(event){
      var target = event.target && event.target.closest ? event.target.closest('a,button,[data-screen-id],[data-route]') : null;
      var href = target && target.getAttribute ? (target.getAttribute('href') || target.getAttribute('data-route') || '') : '';
      var destination = target && target.getAttribute ? (target.getAttribute('data-screen-id') || '') : '';
      try { window.parent.postMessage({ type: 'od:mobile-frame-click', sourceScreenId: ${JSON.stringify(sourceScreenId)}, href: href, targetScreenId: destination }, '*'); } catch (_) {}
    }, true);
    try { window.parent.postMessage({ type: 'od:mobile-frame-ready', sourceScreenId: ${JSON.stringify(sourceScreenId)} }, '*'); } catch (_) {}
  })();</script>`;
  return /<\/body\s*>/i.test(html)
    ? html.replace(/<\/body\s*>/i, `${script}</body>`)
    : `${html}\n${script}`;
}

function resolveDestination(
  value: string,
  screens: readonly MobileScreenRecord[],
): MobileScreenRecord | null {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.replace(/^screen:/i, '').replace(/^#\/?/, '');
  return screens.find((screen) =>
    screen.id === raw ||
    screen.id === normalized ||
    screen.routeKey === raw ||
    screen.routeKey === normalized ||
    screen.file === raw ||
    screen.file === normalized ||
    screen.file.endsWith(`/${normalized}`),
  ) ?? null;
}

function defaultScreenHtml(name: string): string {
  const title = name.trim() || 'New screen';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #f7f8fa; color: #18212b; }
      main { min-height: 100vh; padding: calc(24px + env(safe-area-inset-top)) 22px calc(28px + env(safe-area-inset-bottom)); display: grid; align-content: center; gap: 14px; }
      h1 { margin: 0; font-size: 28px; letter-spacing: -0.04em; }
      p { margin: 0; color: #586678; line-height: 1.5; }
      button { min-height: 48px; border: 0; border-radius: 14px; padding: 0 18px; background: #2357e6; color: white; font: inherit; font-weight: 700; }
    </style>
  </head>
  <body><main><h1>${title}</h1><p>Start shaping this mobile screen with the agent or open its source to edit it directly.</p><button type="button">Continue</button></main></body>
</html>`;
}

function triggerMobileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function decodeDataUrl(dataUrl: string): Uint8Array {
  const encoded = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function buildMobileSpa(screens: readonly MobileScreenRecord[], sources: Record<string, string>): string {
  const documents = Object.fromEntries(screens.map((screen) => [screen.id, htmlWithMobileRouteBridge(sources[screen.id] ?? '', screen.id)]));
  const payload = JSON.stringify({ screens, documents }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Mobile prototype</title>
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;display:grid;grid-template-columns:220px 1fr;min-height:100vh;background:#eef1f5;color:#15202b;font:14px system-ui,sans-serif}nav{padding:24px 14px;background:#fff;border-right:1px solid #d9e0e8}nav h1{margin:0 8px 18px;font-size:16px}nav button{display:block;width:100%;margin:4px 0;padding:10px;border:1px solid transparent;border-radius:8px;background:transparent;text-align:left;color:inherit;cursor:pointer}nav button.active,nav button:hover{border-color:#b9c9f7;background:#eef3ff;color:#2357e6}main{display:grid;place-items:center;padding:28px}iframe{width:min(390px,100%);height:min(844px,calc(100vh - 56px));border:12px solid #202832;border-radius:28px;background:#fff;box-shadow:0 18px 60px #26303d44}</style></head>
<body><nav><h1>Mobile prototype</h1><div id="screen-list"></div></nav><main><iframe id="screen" title="Mobile screen preview" sandbox="allow-scripts allow-forms"></iframe></main>
<script type="application/json" id="mobile-data">${payload}</script><script>(function(){
  var data=JSON.parse(document.getElementById('mobile-data').textContent||'{}'), frame=document.getElementById('screen'), list=document.getElementById('screen-list'), current=data.screens&&data.screens[0]||null;
  function find(value){var raw=String(value||'').trim().replace(/^screen:/i,'').replace(/^#\/?/,'');return (data.screens||[]).find(function(s){return s.id===value||s.id===raw||s.routeKey===value||s.routeKey===raw||s.file===value||s.file===raw||s.file.endsWith('/'+raw);})||null;}
  function render(screen){if(!screen)return;current=screen;frame.srcdoc=data.documents[screen.id]||'';Array.prototype.forEach.call(list.children,function(button){button.classList.toggle('active',button.dataset.id===screen.id);});}
  (data.screens||[]).forEach(function(screen){var button=document.createElement('button');button.textContent=screen.name;button.dataset.id=screen.id;button.onclick=function(){render(screen);};list.appendChild(button);});
  window.addEventListener('message',function(event){var message=event.data||{};if(message.type!=='od:mobile-frame-click')return;var target=find(message.targetScreenId||message.href);if(target)render(target);});render(current);
})();</script></body></html>`;
}

function MobileCanvasMinimap({
  screens,
  editor,
  canvasSize,
  selectedScreenId,
  onCenter,
}: {
  screens: readonly MobileScreenRecord[];
  editor: MobileEditorMetadata['editor'];
  canvasSize: CanvasSize;
  selectedScreenId: string | null;
  onCenter: (point: { x: number; y: number }) => void;
}) {
  const minimapWidth = 180;
  const minimapHeight = 112;
  const padding = 8;
  const screenBounds = mobileScreensBounds(screens);
  const viewBounds = mobileViewportWorldBounds(editor, {
    width: canvasSize.width || 720,
    height: canvasSize.height || 560,
  });
  const bounds = {
    minX: Math.min(screenBounds.minX, viewBounds.minX),
    minY: Math.min(screenBounds.minY, viewBounds.minY),
    maxX: Math.max(screenBounds.maxX, viewBounds.maxX),
    maxY: Math.max(screenBounds.maxY, viewBounds.maxY),
  };
  const worldWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const worldHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(
    (minimapWidth - padding * 2) / worldWidth,
    (minimapHeight - padding * 2) / worldHeight,
  );
  const offsetX = (minimapWidth - worldWidth * scale) / 2;
  const offsetY = (minimapHeight - worldHeight * scale) / 2;
  const mapPoint = (value: number, axis: 'x' | 'y') =>
    (value - (axis === 'x' ? bounds.minX : bounds.minY)) * scale
    + (axis === 'x' ? offsetX : offsetY);
  const mapSize = (value: number) => Math.max(2, value * scale);
  const centerFromPointer = (clientX: number, clientY: number, rect: DOMRect) => {
    onCenter({
      x: bounds.minX + Math.max(0, Math.min(worldWidth, (clientX - rect.left - offsetX) / scale)),
      y: bounds.minY + Math.max(0, Math.min(worldHeight, (clientY - rect.top - offsetY) / scale)),
    });
  };

  return (
    <div
      className="mobile-canvas-minimap"
      role="button"
      tabIndex={0}
      aria-label="Canvas minimap"
      data-testid="mobile-canvas-minimap"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => centerFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onCenter({
          x: bounds.minX + worldWidth / 2,
          y: bounds.minY + worldHeight / 2,
        });
      }}
    >
      <span className="mobile-canvas-minimap__label">Map</span>
      {screens.map((screen) => (
        <span
          key={screen.id}
          className={`mobile-canvas-minimap__screen${screen.id === selectedScreenId ? ' is-selected' : ''}`}
          aria-hidden="true"
          style={{
            left: mapPoint(screen.x, 'x'),
            top: mapPoint(screen.y, 'y'),
            width: mapSize(screen.width),
            height: mapSize(screen.height),
          }}
        />
      ))}
      <span
        className="mobile-canvas-minimap__viewport"
        aria-hidden="true"
        style={{
          left: mapPoint(viewBounds.minX, 'x'),
          top: mapPoint(viewBounds.minY, 'y'),
          width: mapSize(viewBounds.maxX - viewBounds.minX),
          height: mapSize(viewBounds.maxY - viewBounds.minY),
        }}
      />
    </div>
  );
}

export function MobileCanvasEditor({
  projectId,
  files,
  metadata,
  workspaceContext,
  viewerOnly = false,
  selectedScreenId,
  onSelectScreen,
  onManifestChange,
  onOpenFile,
  onOpenSourceFiles,
  onRefreshFiles,
}: MobileCanvasEditorProps) {
  const htmlFiles = useMemo(
    () => files.filter((file) => file.kind === 'html' || /\.html?$/i.test(file.name)),
    [files],
  );
  const availableNames = useMemo(() => htmlFiles.map((file) => file.name), [htmlFiles]);
  const [canonicalManifest, setCanonicalManifest] = useState<MobileManifest | null>(null);
  const [canonicalManifestLoaded, setCanonicalManifestLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCanonicalManifest(null);
    setCanonicalManifestLoaded(false);
    void fetchProjectFileText(projectId, MOBILE_MANIFEST_FILE, {
      workspaceContext,
      cache: 'no-store',
    }).then((value) => {
      if (cancelled) return;
      setCanonicalManifest(parseMobileManifest(value, projectId));
      setCanonicalManifestLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, workspaceContext]);

  const mobileMetadataSource = useMemo(() => {
    if (!canonicalManifestLoaded || !canonicalManifest) return metadata;
    return {
      ...(metadata ?? {}),
      screens: canonicalManifest.screens,
      editor: canonicalManifest.editor,
      selectedScreenId: canonicalManifest.selectedScreenId ?? null,
    } as ProjectMetadata['mobileEditor'];
  }, [canonicalManifest, canonicalManifestLoaded, metadata]);

  const reconciledScreens = useMemo(
    () => reconcileMobileScreenRecords(mobileMetadataSource?.screens ?? [], availableNames),
    [availableNames, mobileMetadataSource?.screens],
  );
  const [localScreens, setLocalScreens] = useState<MobileScreenRecord[] | null>(null);
  const screens = localScreens ?? reconciledScreens;
  const [editor, setEditor] = useState(mobileMetadataSource?.editor ?? DEFAULT_EDITOR);
  const [internalSelectedScreenId, setInternalSelectedScreenId] = useState<string | null>(
    mobileMetadataSource?.selectedScreenId ?? null,
  );
  const effectiveSelectedScreenId = selectedScreenId ?? internalSelectedScreenId;
  const [sources, setSources] = useState<Record<string, string>>({});
  const [previewBaseHrefs, setPreviewBaseHrefs] = useState<Record<string, string>>({});
  const [loadingSources, setLoadingSources] = useState(true);
  const [flowPreviewId, setFlowPreviewId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPersistedSignatureRef = useRef(screenSignature(metadata));
  const frameRefs = useRef(new Map<string, HTMLIFrameElement>());
  const flowFrameRef = useRef<HTMLIFrameElement | null>(null);
  const bootstrappedProjectRef = useRef<string | null>(null);
  const panRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const screenDragRef = useRef<{
    id: string;
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressNextScreenClickRef = useRef(false);
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const lastManifestFileSignatureRef = useRef<string | null>(null);
  const manifestPersistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const canvasShellRef = useRef<HTMLDivElement | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [interactionMode, setInteractionMode] = useState<CanvasInteractionMode>('select');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef(editor);

  useEffect(() => {
    if (!actionsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActionsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [actionsOpen]);

  useEffect(() => {
    setLocalScreens(null);
  }, [reconciledScreens]);

  useEffect(() => {
    setLocalScreens(null);
  }, [projectId]);

  const persist = useCallback((
    nextScreens: MobileScreenRecord[],
    nextSelected = effectiveSelectedScreenId ?? null,
    nextEditor = editorRef.current,
  ) => {
    const next = manifestFor(mobileMetadataSource, nextScreens, nextSelected, nextEditor);
    setLocalScreens(nextScreens);
    lastPersistedSignatureRef.current = screenSignature(next);

    const fileSignature = JSON.stringify({
      screens: next.screens,
      selectedScreenId: next.selectedScreenId ?? null,
    });
    if (!viewerOnly) lastManifestFileSignatureRef.current = fileSignature;

    const write = async () => {
      try {
        await onManifestChange?.(next);
        if (!viewerOnly) {
          const written = await writeProjectTextFile(
            projectId,
            MOBILE_MANIFEST_FILE,
            manifestDocument(projectId, next),
            { versionSource: 'manual' },
            workspaceContext,
          );
          if (!written) throw new Error('Could not persist the mobile manifest.');
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not persist the mobile manifest.');
      }
    };

    const queuedWrite = manifestPersistQueueRef.current
      .catch(() => {})
      .then(write);
    manifestPersistQueueRef.current = queuedWrite;
    return queuedWrite;
  }, [
    effectiveSelectedScreenId,
    mobileMetadataSource,
    onManifestChange,
    projectId,
    viewerOnly,
    workspaceContext,
  ]);

  useEffect(() => {
    const incoming = mobileMetadataSource?.editor ?? DEFAULT_EDITOR;
    setEditor((current) => {
      if (current.x === incoming.x && current.y === incoming.y && current.zoom === incoming.zoom) return current;
      editorRef.current = incoming;
      return incoming;
    });
  }, [mobileMetadataSource?.editor]);

  useEffect(() => {
    if (selectedScreenId !== undefined) return;
    setInternalSelectedScreenId((current) => {
      if (current && screens.some((screen) => screen.id === current)) return current;
      return mobileMetadataSource?.selectedScreenId && screens.some((screen) => screen.id === mobileMetadataSource.selectedScreenId)
        ? mobileMetadataSource.selectedScreenId
        : screens[0]?.id ?? null;
    });
  }, [mobileMetadataSource?.selectedScreenId, screens, selectedScreenId]);

  useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport) return;
    const measure = () => {
      const rect = viewport.getBoundingClientRect();
      setCanvasSize((current) => current.width === rect.width && current.height === rect.height
        ? current
        : { width: rect.width, height: rect.height });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === canvasShellRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!onManifestChange || htmlFiles.length === 0) return;
    const nextSelected = effectiveSelectedScreenId && screens.some((screen) => screen.id === effectiveSelectedScreenId)
      ? effectiveSelectedScreenId
      : mobileMetadataSource?.selectedScreenId && screens.some((screen) => screen.id === mobileMetadataSource.selectedScreenId)
        ? mobileMetadataSource.selectedScreenId
        : screens[0]?.id ?? null;
    const next = manifestFor(mobileMetadataSource, screens, nextSelected, editorRef.current);
    const signature = screenSignature(next);
    if (signature === lastPersistedSignatureRef.current) return;
    lastPersistedSignatureRef.current = signature;

    const fileSignature = JSON.stringify({
      screens: next.screens,
      selectedScreenId: next.selectedScreenId ?? null,
    });
    if (!viewerOnly) lastManifestFileSignatureRef.current = fileSignature;

    const write = async () => {
      try {
        await onManifestChange(next);
        if (!viewerOnly) {
          const written = await writeProjectTextFile(
            projectId,
            MOBILE_MANIFEST_FILE,
            manifestDocument(projectId, next),
            { versionSource: 'manual' },
            workspaceContext,
          );
          if (!written) throw new Error('Could not persist the mobile manifest.');
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not persist the mobile manifest.');
      }
    };

    const queuedWrite = manifestPersistQueueRef.current
      .catch(() => {})
      .then(write);
    manifestPersistQueueRef.current = queuedWrite;
  }, [effectiveSelectedScreenId, htmlFiles.length, mobileMetadataSource, onManifestChange, projectId, viewerOnly, workspaceContext]);

  useEffect(() => {
    if (bootstrappedProjectRef.current === projectId || htmlFiles.length > 0 || viewerOnly) return;
    bootstrappedProjectRef.current = projectId;
    setBusy('create');
    void writeProjectTextFile(
      projectId,
      'screens/home.html',
      defaultScreenHtml('Home'),
      { versionSource: 'manual' },
      workspaceContext,
    ).then(async (file) => {
      if (!file) setError('Could not create the first mobile screen.');
      await onRefreshFiles?.();
    }).finally(() => setBusy(null));
  }, [htmlFiles.length, onRefreshFiles, projectId, viewerOnly, workspaceContext]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSources(true);
    void Promise.all(screens.map(async (screen) => {
      const html = await fetchProjectFileText(projectId, screen.file, {
        cache: 'no-store',
        workspaceContext,
      });
      return [screen.id, html ?? ''] as const;
    })).then((entries) => {
      if (cancelled) return;
      setSources(Object.fromEntries(entries));
      setLoadingSources(false);
    });
    return () => { cancelled = true; };
  }, [projectId, screens, workspaceContext]);

  useEffect(() => {
    // The mobile canvas uses srcDoc documents, so relative stylesheets,
    // scripts, images, and fonts are fetched by the iframe itself. A hosted
    // iframe cannot attach the Supabase bearer header; give it the same
    // capability-scoped directory base used by the main HTML viewer.
    if (!hostedAuthRequired() || screens.length === 0) {
      setPreviewBaseHrefs({});
      return;
    }
    let cancelled = false;
    void Promise.all(screens.map(async (screen) => {
      const scope = await fetchProjectPreviewBaseHref(
        projectId,
        screen.file,
        workspaceContext,
      );
      return [screen.id, scope?.href ?? null] as const;
    })).then((entries) => {
      if (cancelled) return;
      setPreviewBaseHrefs(Object.fromEntries(
        entries.filter((entry): entry is [string, string] => entry[1] !== null),
      ));
    });
    return () => { cancelled = true; };
  }, [projectId, screens, workspaceContext]);

  const previewBaseHrefFor = useCallback((screen: MobileScreenRecord): string | undefined => {
    if (!hostedAuthRequired()) {
      return projectRawUrl(projectId, screen.file, workspaceContext);
    }
    return previewBaseHrefs[screen.id];
  }, [previewBaseHrefs, projectId, workspaceContext]);

  const selectScreen = useCallback((
    screen: MobileScreenRecord | null,
    { persistChange = true, focus = true } = {},
  ) => {
    if (selectedScreenId === undefined) setInternalSelectedScreenId(screen?.id ?? null);
    onSelectScreen?.(screen);
    let nextEditor = editorRef.current;
    if (screen && focus) {
      nextEditor = editorFocusedOnScreen(screen, editorRef.current);
      editorRef.current = nextEditor;
      setEditor(nextEditor);
    }
    if (persistChange && !viewerOnly) persist(screens, screen?.id ?? null, nextEditor);
  }, [onSelectScreen, persist, screens, selectedScreenId, viewerOnly]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; sourceScreenId?: string; href?: string; targetScreenId?: string } | null;
      if (!data || (data.type !== 'od:mobile-frame-click' && data.type !== 'od:mobile-frame-ready')) return;
      const sourceFrame = data.sourceScreenId ? frameRefs.current.get(data.sourceScreenId) : null;
      const fromFlowPreview = flowFrameRef.current?.contentWindow === event.source;
      if ((!sourceFrame || event.source !== sourceFrame.contentWindow) && !fromFlowPreview) return;
      const source = screens.find((screen) => screen.id === data.sourceScreenId) ?? null;
      if (!source && !fromFlowPreview) return;
      if (data.type === 'od:mobile-frame-ready') return;
      const destination = resolveDestination(data.targetScreenId || data.href || '', screens);
      if (destination) {
        selectScreen(destination);
        if (fromFlowPreview) setFlowPreviewId(destination.id);
      } else if (source) {
        selectScreen(source);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [flowPreviewId, screens, selectScreen]);

  const createScreen = useCallback(async () => {
    if (viewerOnly || screens.length >= MOBILE_MAX_SCREENS) return;
    const name = window.prompt('Screen name', `Screen ${screens.length + 1}`)?.trim();
    if (!name) return;
    const fileBase = `screens/${slugify(name)}`;
    const existingFiles = new Set(files.map((entry) => entry.name));
    let file = `${fileBase}.html`;
    for (let suffix = 2; existingFiles.has(file); suffix += 1) file = `${fileBase}-${suffix}.html`;
    const position = findAvailableMobileScreenPosition({ width: 390, height: 844 }, screens);
    const timestamp = now();
    const record: MobileScreenRecord = {
      id: stableId(), file, name, order: screens.length, ...position,
      width: 390, height: 844, orientation: 'portrait', deviceFrame: 'generic-phone',
      createdAt: timestamp, updatedAt: timestamp,
    };
    setBusy('create');
    setError(null);
    try {
      const created = await writeProjectTextFile(projectId, file, defaultScreenHtml(name), { versionSource: 'manual' }, workspaceContext);
      if (!created) {
        setError('Could not create that screen.');
        return;
      }
      const nextScreens = [...screens, record];
      const nextEditor = editorFocusedOnScreen(record, editorRef.current);
      editorRef.current = nextEditor;
      setEditor(nextEditor);
      if (selectedScreenId === undefined) setInternalSelectedScreenId(record.id);
      onSelectScreen?.(record);
      await persist(nextScreens, record.id, nextEditor);
      await onRefreshFiles?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create that screen.');
    } finally {
      setBusy(null);
    }
  }, [files, onRefreshFiles, onSelectScreen, persist, projectId, screens, selectedScreenId, viewerOnly, workspaceContext]);

  const renameScreen = useCallback(async () => {
    const selected = screens.find((screen) => screen.id === effectiveSelectedScreenId);
    if (!selected || viewerOnly) return;
    const name = window.prompt('Rename screen', selected.name)?.trim();
    if (!name || name === selected.name) return;
    const nextFileBase = `screens/${slugify(name)}`;
    const existingFiles = new Set(files.map((entry) => entry.name));
    let nextFile = `${nextFileBase}.html`;
    for (let suffix = 2; existingFiles.has(nextFile) && nextFile !== selected.file; suffix += 1) nextFile = `${nextFileBase}-${suffix}.html`;
    setBusy('rename');
    try {
      await renameProjectFile(projectId, selected.file, nextFile, workspaceContext);
      const next = screens.map((screen) => screen.id === selected.id ? { ...screen, name, file: nextFile, updatedAt: now() } : screen);
      await persist(next, selected.id);
      await onRefreshFiles?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not rename that screen.');
    } finally { setBusy(null); }
  }, [effectiveSelectedScreenId, files, onRefreshFiles, persist, projectId, screens, viewerOnly, workspaceContext]);

  const duplicateScreen = useCallback(async () => {
    const selected = screens.find((screen) => screen.id === effectiveSelectedScreenId);
    if (!selected || viewerOnly || screens.length >= MOBILE_MAX_SCREENS) return;
    const name = `${selected.name} copy`;
    const fileBase = `screens/${slugify(name)}`;
    const existingFiles = new Set(files.map((entry) => entry.name));
    let file = `${fileBase}.html`;
    for (let suffix = 2; existingFiles.has(file); suffix += 1) file = `${fileBase}-${suffix}.html`;
    const position = findAvailableMobileScreenPosition(selected, screens);
    setBusy('duplicate');
    try {
      const html = sources[selected.id] ?? await fetchProjectFileText(projectId, selected.file, { workspaceContext });
      const created = html == null ? null : await writeProjectTextFile(projectId, file, html, { versionSource: 'manual' }, workspaceContext);
      if (!created) {
        setError('Could not duplicate that screen.');
        return;
      }
      const timestamp = now();
      const record = { ...selected, id: stableId(), file, name, order: screens.length, ...position, createdAt: timestamp, updatedAt: timestamp };
      const nextScreens = [...screens, record];
      const nextEditor = editorFocusedOnScreen(record, editorRef.current);
      editorRef.current = nextEditor;
      setEditor(nextEditor);
      if (selectedScreenId === undefined) setInternalSelectedScreenId(record.id);
      onSelectScreen?.(record);
      await persist(nextScreens, record.id, nextEditor);
      await onRefreshFiles?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not duplicate that screen.');
    } finally {
      setBusy(null);
    }
  }, [effectiveSelectedScreenId, files, onRefreshFiles, onSelectScreen, persist, projectId, screens, selectedScreenId, sources, viewerOnly, workspaceContext]);

  const deleteScreen = useCallback(async () => {
    const selected = screens.find((screen) => screen.id === effectiveSelectedScreenId);
    if (!selected || viewerOnly || screens.length <= 1) return;
    if (!window.confirm(`Delete “${selected.name}” and remove its HTML file from this project?`)) return;
    setBusy('delete');
    try {
      const deleted = await deleteProjectFile(projectId, selected.file, workspaceContext);
      if (!deleted) {
        setError('Could not delete that screen.');
        return;
      }
      const next = screens.filter((screen) => screen.id !== selected.id).map((screen, index) => ({ ...screen, order: index }));
      const nextSelected = next[0] ?? null;
      const nextEditor = editorFocusedOnScreen(nextSelected, editorRef.current);
      editorRef.current = nextEditor;
      setEditor(nextEditor);
      if (selectedScreenId === undefined) setInternalSelectedScreenId(nextSelected?.id ?? null);
      onSelectScreen?.(nextSelected);
      await persist(next, nextSelected?.id ?? null, nextEditor);
      await onRefreshFiles?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete that screen.');
    } finally {
      setBusy(null);
    }
  }, [effectiveSelectedScreenId, onRefreshFiles, onSelectScreen, persist, projectId, screens, selectedScreenId, viewerOnly, workspaceContext]);

  const reorder = useCallback((direction: -1 | 1) => {
    if (viewerOnly) return;
    const index = screens.findIndex((screen) => screen.id === effectiveSelectedScreenId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= screens.length) return;
    const next = [...screens];
    [next[index], next[target]] = [next[target]!, next[index]!];
    persist(next.map((screen, order) => ({ ...screen, order, updatedAt: now() })));
  }, [effectiveSelectedScreenId, persist, screens, viewerOnly]);

  const selected = screens.find((screen) => screen.id === effectiveSelectedScreenId) ?? screens[0] ?? null;
  const flowScreen = screens.find((screen) => screen.id === flowPreviewId) ?? screens[0] ?? null;
  const flowHtml = flowScreen ? sources[flowScreen.id] ?? '' : '';
  const flowPreviewBaseHref = flowScreen ? previewBaseHrefFor(flowScreen) : undefined;
  const zoomLabel = `${Math.round(editor.zoom * 100)}%`;
  const commitEditor = useCallback((nextEditor: MobileEditorMetadata['editor']) => {
    editorRef.current = nextEditor;
    setEditor(nextEditor);
    persist(screens, effectiveSelectedScreenId ?? null, nextEditor);
  }, [effectiveSelectedScreenId, persist, screens]);
  const zoomBy = useCallback((delta: number) => {
    commitEditor({ ...editorRef.current, zoom: clampZoom(editorRef.current.zoom + delta) });
  }, [commitEditor]);
  const centerOnWorldPoint = useCallback((point: { x: number; y: number }) => {
    const width = canvasSize.width || 720;
    const height = canvasSize.height || 560;
    commitEditor({
      ...editorRef.current,
      x: width / 2 - point.x * editorRef.current.zoom,
      y: height / 2 - point.y * editorRef.current.zoom,
    });
  }, [canvasSize.height, canvasSize.width, commitEditor]);
  const centerSelected = useCallback(() => {
    if (!selected) return;
    centerOnWorldPoint({
      x: selected.x + selected.width / 2,
      y: selected.y + selected.height / 2,
    });
  }, [centerOnWorldPoint, selected]);
  const fitAllScreens = useCallback(() => {
    const width = canvasSize.width || 720;
    const height = canvasSize.height || 560;
    const bounds = mobileScreensBounds(screens);
    const padding = 80;
    const zoom = clampZoom(Math.min(
      (width - padding * 2) / Math.max(bounds.maxX - bounds.minX, 1),
      (height - padding * 2) / Math.max(bounds.maxY - bounds.minY, 1),
    ));
    commitEditor({
      zoom,
      x: width / 2 - (bounds.minX + (bounds.maxX - bounds.minX) / 2) * zoom,
      y: height / 2 - (bounds.minY + (bounds.maxY - bounds.minY) / 2) * zoom,
    });
  }, [canvasSize.height, canvasSize.width, commitEditor, screens]);
  const toggleFullscreen = useCallback(async () => {
    const shell = canvasShellRef.current;
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) await document.exitFullscreen();
      else if (shell.requestFullscreen) await shell.requestFullscreen();
      else setError('Fullscreen is not available in this browser.');
    } catch {
      setError('Could not change fullscreen mode.');
    }
  }, []);
  const updateSelectedScreen = useCallback((patch: Partial<MobileScreenRecord>) => {
    const current = screens.find((screen) => screen.id === effectiveSelectedScreenId);
    if (!current || viewerOnly) return;
    const nextCurrent = { ...current, ...patch, updatedAt: now() };
    const otherScreens = screens.filter((screen) => screen.id !== current.id);
    const positionStillValid =
      nextCurrent.x >= 0 &&
      nextCurrent.y >= 0 &&
      !otherScreens.some((screen) => mobileScreenRecordsOverlap(nextCurrent, screen));
    const placement = positionStillValid
      ? { x: nextCurrent.x, y: nextCurrent.y }
      : findAvailableMobileScreenPosition(nextCurrent, otherScreens);
    persist(
      screens.map((screen) => screen.id === current.id ? { ...nextCurrent, ...placement } : screen),
      current.id,
    );
  }, [effectiveSelectedScreenId, persist, screens, viewerOnly]);

  const finishPan = useCallback(() => {
    if (!panRef.current) return;
    panRef.current = null;
    if (!viewerOnly) persist(screens, effectiveSelectedScreenId ?? null, editorRef.current);
  }, [effectiveSelectedScreenId, persist, screens, viewerOnly]);

  const exportHtmlScreens = useCallback(async () => {
    setExportBusy('html');
    setError(null);
    const ok = await downloadProjectArchive({ projectId, fallbackTitle: 'mobile-screens', root: 'screens', workspaceContext });
    if (!ok) setError('Could not export the HTML screens.');
    setExportBusy(null);
    setExportOpen(false);
  }, [projectId, workspaceContext]);

  const exportPngScreens = useCallback(async () => {
    setExportBusy('png');
    setError(null);
    try {
      const entries: Array<{ path: string; content: Uint8Array }> = [];
      for (const screen of screens) {
        const result = await exportProjectImageDataUrl({
          projectId,
          fileName: screen.file,
          width: screen.width,
          height: screen.height,
          workspaceContext,
        });
        if (!result.ok) throw new Error(`Could not render ${screen.name}.`);
        entries.push({ path: `${slugify(screen.name)}.png`, content: decodeDataUrl(result.snapshot.dataUrl) });
      }
      triggerMobileDownload(buildZip(entries), 'mobile-screens-png.zip');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not export PNG screens.');
    } finally {
      setExportBusy(null);
      setExportOpen(false);
    }
  }, [projectId, screens, workspaceContext]);

  const exportSpa = useCallback(() => {
    if (screens.length === 0) return;
    setError(null);
    triggerMobileDownload(buildZip([
      { path: 'index.html', content: buildMobileSpa(screens, sources) },
      { path: 'mobile-manifest.json', content: manifestDocument(projectId, manifestFor(metadata, screens, effectiveSelectedScreenId ?? null, editor)) },
    ]), 'mobile-prototype-spa.zip');
    setExportOpen(false);
  }, [editor, effectiveSelectedScreenId, metadata, projectId, screens, sources]);

  const importFiles = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selectedFiles.length === 0 || viewerOnly) return;
    setBusy('import');
    setError(null);
    try {
      const existingFiles = new Set(files.map((entry) => entry.name));
      for (const file of selectedFiles) {
        if (/\.fig$/i.test(file.name)) {
          const result = await importProjectFigma(projectId, file, undefined, workspaceContext);
          if (!result.ok) throw new Error(result.error);
          continue;
        }
        const safeName = slugify(file.name.replace(/\.[^.]+$/, ''));
        const isHtml = /\.html?$/i.test(file.name);
        const targetBase = isHtml ? `screens/${safeName}` : `assets/${safeName}`;
        let targetName = `${targetBase}${isHtml ? '.html' : file.name.slice(file.name.lastIndexOf('.'))}`;
        for (let suffix = 2; existingFiles.has(targetName); suffix += 1) {
          const extension = isHtml ? '.html' : file.name.slice(file.name.lastIndexOf('.'));
          targetName = `${targetBase}-${suffix}${extension}`;
        }
        const uploaded = await uploadProjectFile(projectId, file, targetName, workspaceContext);
        if (!uploaded) throw new Error(`Could not import ${file.name}.`);
        existingFiles.add(targetName);
      }
      await onRefreshFiles?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import those files.');
    } finally {
      setBusy(null);
    }
  }, [files, onRefreshFiles, projectId, viewerOnly, workspaceContext]);

  return (
    <section className="mobile-editor" data-testid="mobile-canvas-editor">
      <header className="mobile-editor-toolbar">
        <div className="mobile-editor-heading">
          <span className="mobile-editor-icon"><Icon name="smartphone" size={16} /></span>
          <div><strong>Mobile screens</strong><span>{screens.length} of {MOBILE_MAX_SCREENS} · {MOBILE_MANIFEST_SCHEMA}</span></div>
        </div>
        <div className="mobile-editor-toolbar-actions">
          <div className={`mobile-editor-actions${actionsOpen ? ' is-open' : ''}`} role={actionsOpen ? 'menu' : undefined}>
            <input ref={importInputRef} className="mobile-import-input" type="file" multiple accept=".html,.htm,.png,.jpg,.jpeg,.webp,.svg,.fig" onChange={(event) => void importFiles(event)} />
            <button type="button" className="mobile-editor-button subtle" onClick={() => importInputRef.current?.click()} disabled={viewerOnly || busy !== null} aria-label="Import files" title="Import files"><Icon name="import" size={14} /><span className="mobile-editor-action-label">Import</span></button>
            <button type="button" className="mobile-editor-button subtle" onClick={onOpenSourceFiles} disabled={!onOpenSourceFiles} aria-label="Open source files" title="Open source files"><Icon name="file-code" size={14} /><span className="mobile-editor-action-label">Source files</span></button>
            <button type="button" className="mobile-editor-button subtle" onClick={() => setFlowPreviewId(flowScreen?.id ?? null)} disabled={!flowScreen} aria-label="Preview flow" title="Preview flow"><Icon name="play" size={14} /><span className="mobile-editor-action-label">Preview flow</span></button>
            <button type="button" className="mobile-editor-button subtle" onClick={() => selected && onOpenFile?.(selected.file)} disabled={!selected || !onOpenFile} aria-label="Open as design file" title="Open as design file"><Icon name="edit" size={14} /><span className="mobile-editor-action-label">Open design file</span></button>
            <div className="mobile-export-control">
              <button type="button" className="mobile-editor-button subtle" onClick={() => setExportOpen((open) => !open)} disabled={exportBusy !== null} aria-label="Export mobile prototype" title="Export mobile prototype"><Icon name="download" size={14} /><span className="mobile-editor-action-label">Export</span><Icon name="chevron-down" size={12} /></button>
              {exportOpen ? <div className="mobile-export-menu" role="menu"><button type="button" role="menuitem" onClick={() => void exportHtmlScreens()}><Icon name="file-code" size={13} /> HTML screens (.zip)</button><button type="button" role="menuitem" onClick={() => void exportPngScreens()}><Icon name="image" size={13} /> PNG screens (.zip)</button><button type="button" role="menuitem" onClick={exportSpa}><Icon name="globe" size={13} /> Runnable SPA (.zip)</button></div> : null}
            </div>
          </div>
          <button type="button" className="mobile-editor-more" onClick={() => setActionsOpen((open) => !open)} aria-haspopup="menu" aria-expanded={actionsOpen} aria-label="More mobile screen actions" title="More actions"><Icon name="more-horizontal" size={17} /></button>
          <button type="button" className="mobile-editor-button primary mobile-editor-new-screen" onClick={() => void createScreen()} disabled={viewerOnly || screens.length >= MOBILE_MAX_SCREENS || busy !== null} aria-label="Create new screen" title="Create new screen"><Icon name="plus" size={14} /><span className="mobile-editor-action-label">New screen</span></button>
        </div>
      </header>
      {error ? <div className="mobile-editor-error" role="alert">{error}<button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><Icon name="close" size={13} /></button></div> : null}
      <div className="mobile-editor-layout">
        <aside className="mobile-screen-rail" aria-label="Mobile screens">
          <div className="mobile-screen-rail-title"><span>Screens</span><span>{screens.length}</span></div>
          {screens.map((screen) => (
            <button key={screen.id} type="button" className={`mobile-screen-list-item${selected?.id === screen.id ? ' selected' : ''}`} onClick={() => selectScreen(screen)}>
              <span className="mobile-screen-list-preview"><span /></span>
              <span className="mobile-screen-list-copy"><strong>{screen.name}</strong><small>{screen.file}</small></span>
            </button>
          ))}
          {screens.length === 0 && !loadingSources ? <div className="mobile-screen-empty">Your first screen will appear here.</div> : null}
        </aside>
        <div ref={canvasShellRef} className={`mobile-canvas-shell${isFullscreen ? ' is-fullscreen' : ''}`}>
          <div className="mobile-canvas-toolbar">
            <span>{selected ? <><b>{selected.name}</b><span className="mobile-selection-id">{selected.id.slice(0, 8)}</span></> : 'Select a screen'}</span>
            <div className="mobile-canvas-controls">
              {selected ? (
                <>
                  <label className="mobile-canvas-orientation" title="Screen orientation">
                    <Icon name="smartphone" size={13} />
                    <select
                      aria-label="Orientation"
                      value={selected.orientation}
                      disabled={viewerOnly}
                      onChange={(event) => {
                        const orientation = event.target.value as MobileScreenRecord['orientation'];
                        updateSelectedScreen({
                          orientation,
                          width: orientation === 'portrait' ? 390 : 844,
                          height: orientation === 'portrait' ? 844 : 390,
                        });
                      }}
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>
                  <div className="mobile-canvas-screen-actions" role="group" aria-label="Selected screen actions">
                    <button type="button" onClick={() => void renameScreen()} disabled={viewerOnly || busy !== null} title="Rename screen" aria-label="Rename screen"><Icon name="pencil" size={14} /></button>
                    <button type="button" onClick={() => void duplicateScreen()} disabled={viewerOnly || busy !== null || screens.length >= MOBILE_MAX_SCREENS} title="Duplicate screen" aria-label="Duplicate screen"><Icon name="copy" size={14} /></button>
                    <button type="button" onClick={() => reorder(-1)} disabled={viewerOnly || selected.order === 0} title="Move screen earlier" aria-label="Move screen earlier"><Icon name="arrow-up" size={14} /></button>
                    <button type="button" onClick={() => reorder(1)} disabled={viewerOnly || selected.order >= screens.length - 1} title="Move screen later" aria-label="Move screen later"><Icon name="chevron-down" size={14} /></button>
                    <button type="button" className="danger" onClick={() => void deleteScreen()} disabled={viewerOnly || screens.length <= 1 || busy !== null} title="Delete screen" aria-label="Delete screen"><Icon name="trash" size={14} /></button>
                  </div>
                </>
              ) : null}
              <div className="mobile-canvas-control-group" role="group" aria-label="Canvas mode">
                <button type="button" className={interactionMode === 'select' ? 'active' : ''} onClick={() => setInteractionMode('select')} aria-pressed={interactionMode === 'select'} title="Select mode" aria-label="Select mode"><Icon name="artboard" size={14} /></button>
                <button type="button" className={interactionMode === 'pan' ? 'active' : ''} onClick={() => setInteractionMode('pan')} aria-pressed={interactionMode === 'pan'} title="Pan mode" aria-label="Pan mode"><Icon name="orbit" size={14} /></button>
              </div>
              <button type="button" className={snapToGrid ? 'active' : ''} onClick={() => setSnapToGrid((enabled) => !enabled)} aria-pressed={snapToGrid} title={`Snap to ${MOBILE_GRID_SIZE}px grid`} aria-label={`Snap to ${MOBILE_GRID_SIZE}px grid`}><Icon name="grid" size={14} /></button>
              <button type="button" onClick={centerSelected} disabled={!selected} title="Center selected screen" aria-label="Center selected screen"><Icon name="artboard" size={14} /></button>
              <button type="button" onClick={fitAllScreens} title="Fit all screens" aria-label="Fit all screens"><Icon name="maximize" size={14} /></button>
              <span className="mobile-canvas-zoom-group" role="group" aria-label="Canvas zoom">
                <button type="button" onClick={() => zoomBy(-0.1)} aria-label="Zoom out" title="Zoom out"><Icon name="zoom-out" size={14} /></button>
                <span>{zoomLabel}</span>
                <button type="button" onClick={() => zoomBy(0.1)} aria-label="Zoom in" title="Zoom in"><Icon name="zoom-in" size={14} /></button>
              </span>
              <button type="button" onClick={() => commitEditor(DEFAULT_EDITOR)} title="Reset view" aria-label="Reset view"><Icon name="refresh" size={14} /></button>
              <button type="button" onClick={() => void toggleFullscreen()} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}><Icon name={isFullscreen ? 'minimize' : 'maximize'} size={14} /></button>
            </div>
          </div>
          <div
            ref={canvasViewportRef}
            className={`mobile-canvas-viewport${interactionMode === 'pan' ? ' is-pan-mode' : ''}`}
            onPointerDown={(event) => {
              if (interactionMode !== 'pan' && event.target !== event.currentTarget) return;
              panRef.current = { x: editorRef.current.x, y: editorRef.current.y, startX: event.clientX, startY: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = panRef.current;
              if (!start) return;
              setEditor((current) => {
                const next = { ...current, x: start.x + event.clientX - start.startX, y: start.y + event.clientY - start.startY };
                editorRef.current = next;
                return next;
              });
            }}
            onPointerUp={finishPan}
            onPointerCancel={finishPan}
            onLostPointerCapture={finishPan}
          >
            <div className="mobile-canvas-world" style={{ transform: `translate(${editor.x}px, ${editor.y}px) scale(${editor.zoom})` }}>
              {screens.map((screen) => {
                const html = sources[screen.id] ?? '';
                const baseHref = previewBaseHrefFor(screen);
                const srcDoc = html
                  ? buildSrcdoc(
                    htmlWithMobileRouteBridge(html, screen.id),
                    baseHref ? { baseHref } : undefined,
                  )
                  : '';
                return (
                  <article
                    key={screen.id}
                    className={`mobile-device-frame mobile-device-frame--${screen.deviceFrame}${selected?.id === screen.id ? ' selected' : ''}`}
                    data-device-frame={screen.deviceFrame}
                    data-screen-id={screen.id}
                    style={{ left: dragPositions[screen.id]?.x ?? screen.x, top: dragPositions[screen.id]?.y ?? screen.y, width: screen.width + 24 }}
                    onClick={() => {
                      if (suppressNextScreenClickRef.current) {
                        suppressNextScreenClickRef.current = false;
                        return;
                      }
                      if (interactionMode === 'select') selectScreen(screen);
                    }}
                    onPointerDown={(event) => {
                      if (interactionMode !== 'select') return;
                      suppressNextScreenClickRef.current = false;
                      event.stopPropagation();
                      selectScreen(screen, { persistChange: false, focus: false });
                      if (viewerOnly) return;
                      screenDragRef.current = { id: screen.id, x: screen.x, y: screen.y, startX: event.clientX, startY: event.clientY, moved: false };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const drag = screenDragRef.current;
                      if (!drag || drag.id !== screen.id) return;
                      const deltaX = event.clientX - drag.startX;
                      const deltaY = event.clientY - drag.startY;
                      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) drag.moved = true;
                      setDragPositions((current) => ({ ...current, [screen.id]: { x: snapCanvasPosition(Math.max(0, drag.x + deltaX / editorRef.current.zoom), snapToGrid), y: snapCanvasPosition(Math.max(0, drag.y + deltaY / editorRef.current.zoom), snapToGrid) } }));
                    }}
                    onPointerUp={(event) => {
                      const drag = screenDragRef.current;
                      if (!drag || drag.id !== screen.id) return;
                      screenDragRef.current = null;
                      const nextPosition = { x: snapCanvasPosition(Math.max(0, drag.x + (event.clientX - drag.startX) / editorRef.current.zoom), snapToGrid), y: snapCanvasPosition(Math.max(0, drag.y + (event.clientY - drag.startY) / editorRef.current.zoom), snapToGrid) };
                      const moved = drag.moved || Math.abs(event.clientX - drag.startX) > 2 || Math.abs(event.clientY - drag.startY) > 2;
                      suppressNextScreenClickRef.current = moved;
                      const candidate = { ...screen, ...nextPosition };
                      setDragPositions((current) => { const next = { ...current }; delete next[screen.id]; return next; });
                      if (!moved) return;
                      const overlaps = screens.some((other) => other.id !== screen.id && mobileScreenRecordsOverlap(candidate, other));
                      if (overlaps) {
                        setError('Screens cannot overlap. Choose an open canvas position.');
                        return;
                      }
                      persist(screens.map((other) => other.id === screen.id ? { ...other, ...nextPosition, updatedAt: now() } : other), screen.id, editorRef.current);
                    }}
                    onPointerCancel={() => {
                      screenDragRef.current = null;
                      setDragPositions((current) => { const next = { ...current }; delete next[screen.id]; return next; });
                    }}
                    onLostPointerCapture={() => {
                      screenDragRef.current = null;
                      setDragPositions((current) => { const next = { ...current }; delete next[screen.id]; return next; });
                    }}
                  >
                    <div className="mobile-device-chrome"><span>{screen.name}</span><span>{screen.orientation}</span></div>
                    <div className="mobile-device-screen" style={{ width: screen.width, height: screen.height }}>
                      {html ? <iframe ref={(frame) => { if (frame) frameRefs.current.set(screen.id, frame); else frameRefs.current.delete(screen.id); }} title={`${screen.name} preview`} sandbox="allow-scripts allow-forms" srcDoc={srcDoc} /> : <div className="mobile-device-loading">{loadingSources ? 'Loading…' : 'No HTML source'}</div>}
                    </div>
                  </article>
                );
              })}
            </div>
            <MobileCanvasMinimap
              screens={screens}
              editor={editor}
              canvasSize={canvasSize}
              selectedScreenId={selected?.id ?? null}
              onCenter={centerOnWorldPoint}
            />
          </div>
        </div>
      </div>
      {flowPreviewId && flowScreen ? (
        <div className="mobile-flow-modal" role="dialog" aria-modal="true" aria-label="Mobile flow preview">
          <div className="mobile-flow-backdrop" onClick={() => setFlowPreviewId(null)} />
          <div className="mobile-flow-dialog">
            <div className="mobile-flow-header"><div><strong>Flow preview</strong><span>Tap links to move through the experience</span></div><button type="button" onClick={() => setFlowPreviewId(null)} aria-label="Close flow preview"><Icon name="close" size={16} /></button></div>
            <div key={flowScreen.id} className={`mobile-flow-device transition-${flowScreen.transition ?? 'none'}`}><div className="mobile-device-chrome"><span>{flowScreen.name}</span><span>simulated device</span></div><div className="mobile-device-screen"><iframe ref={flowFrameRef} title={`${flowScreen.name} flow preview`} sandbox="allow-scripts allow-forms" srcDoc={flowHtml ? buildSrcdoc(htmlWithMobileRouteBridge(flowHtml, flowScreen.id), flowPreviewBaseHref ? { baseHref: flowPreviewBaseHref } : undefined) : ''} /></div></div>
            <div className="mobile-flow-footer"><span>{screens.findIndex((screen) => screen.id === flowScreen.id) + 1} / {screens.length}</span><div>{screens.map((screen) => <button key={screen.id} type="button" className={screen.id === flowScreen.id ? 'active' : ''} onClick={() => { setFlowPreviewId(screen.id); selectScreen(screen); }}>{screen.name}</button>)}</div></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
