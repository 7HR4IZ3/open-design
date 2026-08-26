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
  reconcileMobileScreenRecords,
} from '@open-design/contracts';
import type { ProjectFile } from '../types';
import {
  deleteProjectFile,
  fetchProjectFileText,
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
export const MOBILE_CANVAS_TAB = '__mobile_canvas__';

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
  const screens = useMemo(
    () => reconcileMobileScreenRecords(metadata?.screens ?? [], availableNames),
    [availableNames, metadata?.screens],
  );
  const [editor, setEditor] = useState(metadata?.editor ?? DEFAULT_EDITOR);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [loadingSources, setLoadingSources] = useState(true);
  const [flowPreviewId, setFlowPreviewId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPersistedSignatureRef = useRef(screenSignature(metadata));
  const frameRefs = useRef(new Map<string, HTMLIFrameElement>());
  const flowFrameRef = useRef<HTMLIFrameElement | null>(null);
  const bootstrappedProjectRef = useRef<string | null>(null);
  const panRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const screenDragRef = useRef<{ id: string; x: number; y: number; startX: number; startY: number } | null>(null);
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const lastManifestFileSignatureRef = useRef<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEditor(metadata?.editor ?? DEFAULT_EDITOR);
  }, [metadata?.editor]);

  useEffect(() => {
    if (!onManifestChange || htmlFiles.length === 0) return;
    const nextSelected = selectedScreenId && screens.some((screen) => screen.id === selectedScreenId)
      ? selectedScreenId
      : metadata?.selectedScreenId && screens.some((screen) => screen.id === metadata.selectedScreenId)
        ? metadata.selectedScreenId
        : screens[0]?.id ?? null;
    const next = manifestFor(metadata, screens, nextSelected, editor);
    const signature = screenSignature(next);
    if (signature === lastPersistedSignatureRef.current) return;
    lastPersistedSignatureRef.current = signature;
    void onManifestChange(next);
    const fileSignature = JSON.stringify({ screens: next.screens, selectedScreenId: next.selectedScreenId ?? null });
    if (fileSignature !== lastManifestFileSignatureRef.current && !viewerOnly) {
      lastManifestFileSignatureRef.current = fileSignature;
      void writeProjectTextFile(
        projectId,
        MOBILE_MANIFEST_FILE,
        manifestDocument(projectId, next),
        { versionSource: 'manual' },
        workspaceContext,
      );
    }
  }, [editor, htmlFiles.length, metadata, onManifestChange, projectId, screens, selectedScreenId, viewerOnly, workspaceContext]);

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

  const selectScreen = useCallback((screen: MobileScreenRecord | null) => {
    onSelectScreen?.(screen);
    if (screen) {
      setEditor((current) => ({ ...current, x: Math.max(24, 420 - screen.x * current.zoom), y: Math.max(24, 220 - screen.y * current.zoom) }));
    }
  }, [onSelectScreen]);

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

  const persist = useCallback((nextScreens: MobileScreenRecord[], nextSelected = selectedScreenId ?? null, nextEditor = editor) => {
    const next = manifestFor(metadata, nextScreens, nextSelected, nextEditor);
    lastPersistedSignatureRef.current = screenSignature(next);
    void onManifestChange?.(next);
    if (!viewerOnly) {
      lastManifestFileSignatureRef.current = JSON.stringify({ screens: next.screens, selectedScreenId: next.selectedScreenId ?? null });
      void writeProjectTextFile(
        projectId,
        MOBILE_MANIFEST_FILE,
        manifestDocument(projectId, next),
        { versionSource: 'manual' },
        workspaceContext,
      );
    }
  }, [editor, metadata, onManifestChange, projectId, selectedScreenId, viewerOnly, workspaceContext]);

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
    const created = await writeProjectTextFile(projectId, file, defaultScreenHtml(name), { versionSource: 'manual' }, workspaceContext);
    if (!created) setError('Could not create that screen.');
    else { persist([...screens, record], record.id); selectScreen(record); await onRefreshFiles?.(); }
    setBusy(null);
  }, [files, onRefreshFiles, persist, projectId, screens, selectScreen, viewerOnly, workspaceContext]);

  const renameScreen = useCallback(async () => {
    const selected = screens.find((screen) => screen.id === selectedScreenId);
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
      persist(next, selected.id);
      await onRefreshFiles?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not rename that screen.');
    } finally { setBusy(null); }
  }, [files, onRefreshFiles, persist, projectId, screens, selectedScreenId, viewerOnly, workspaceContext]);

  const duplicateScreen = useCallback(async () => {
    const selected = screens.find((screen) => screen.id === selectedScreenId);
    if (!selected || viewerOnly || screens.length >= MOBILE_MAX_SCREENS) return;
    const name = `${selected.name} copy`;
    const fileBase = `screens/${slugify(name)}`;
    const existingFiles = new Set(files.map((entry) => entry.name));
    let file = `${fileBase}.html`;
    for (let suffix = 2; existingFiles.has(file); suffix += 1) file = `${fileBase}-${suffix}.html`;
    const position = findAvailableMobileScreenPosition(selected, screens);
    setBusy('duplicate');
    const html = sources[selected.id] ?? await fetchProjectFileText(projectId, selected.file, { workspaceContext });
    const created = html == null ? null : await writeProjectTextFile(projectId, file, html, { versionSource: 'manual' }, workspaceContext);
    if (!created) setError('Could not duplicate that screen.');
    else {
      const timestamp = now();
      const record = { ...selected, id: stableId(), file, name, order: screens.length, ...position, createdAt: timestamp, updatedAt: timestamp };
      persist([...screens, record], record.id);
      selectScreen(record);
      await onRefreshFiles?.();
    }
    setBusy(null);
  }, [files, onRefreshFiles, persist, projectId, screens, selectScreen, selectedScreenId, sources, viewerOnly, workspaceContext]);

  const deleteScreen = useCallback(async () => {
    const selected = screens.find((screen) => screen.id === selectedScreenId);
    if (!selected || viewerOnly || screens.length <= 1) return;
    if (!window.confirm(`Delete “${selected.name}” and remove its HTML file from this project?`)) return;
    setBusy('delete');
    const deleted = await deleteProjectFile(projectId, selected.file, workspaceContext);
    if (!deleted) setError('Could not delete that screen.');
    else {
      const next = screens.filter((screen) => screen.id !== selected.id).map((screen, index) => ({ ...screen, order: index }));
      const nextSelected = next[0] ?? null;
      persist(next, nextSelected?.id ?? null);
      selectScreen(nextSelected);
      await onRefreshFiles?.();
    }
    setBusy(null);
  }, [onRefreshFiles, persist, projectId, screens, selectScreen, selectedScreenId, viewerOnly, workspaceContext]);

  const reorder = useCallback((direction: -1 | 1) => {
    if (viewerOnly) return;
    const index = screens.findIndex((screen) => screen.id === selectedScreenId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= screens.length) return;
    const next = [...screens];
    [next[index], next[target]] = [next[target]!, next[index]!];
    persist(next.map((screen, order) => ({ ...screen, order, updatedAt: now() })));
  }, [persist, screens, selectedScreenId, viewerOnly]);

  const selected = screens.find((screen) => screen.id === selectedScreenId) ?? screens[0] ?? null;
  const flowScreen = screens.find((screen) => screen.id === flowPreviewId) ?? screens[0] ?? null;
  const flowHtml = flowScreen ? sources[flowScreen.id] ?? '' : '';
  const zoomLabel = `${Math.round(editor.zoom * 100)}%`;
  const updateSelectedScreen = useCallback((patch: Partial<MobileScreenRecord>) => {
    const current = screens.find((screen) => screen.id === selectedScreenId);
    if (!current || viewerOnly) return;
    const nextCurrent = { ...current, ...patch, updatedAt: now() };
    const otherScreens = screens.filter((screen) => screen.id !== current.id);
    const placement = findAvailableMobileScreenPosition(nextCurrent, otherScreens);
    persist(
      screens.map((screen) => screen.id === current.id ? { ...nextCurrent, ...placement } : screen),
      current.id,
    );
  }, [persist, screens, selectedScreenId, viewerOnly]);

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
      { path: 'mobile-manifest.json', content: manifestDocument(projectId, manifestFor(metadata, screens, selectedScreenId ?? null, editor)) },
    ]), 'mobile-prototype-spa.zip');
    setExportOpen(false);
  }, [editor, metadata, projectId, screens, selectedScreenId, sources]);

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
        <div className="mobile-editor-actions">
          <input ref={importInputRef} className="mobile-import-input" type="file" multiple accept=".html,.htm,.png,.jpg,.jpeg,.webp,.svg,.fig" onChange={(event) => void importFiles(event)} />
          <button type="button" className="mobile-editor-button subtle" onClick={() => importInputRef.current?.click()} disabled={viewerOnly || busy !== null}><Icon name="import" size={14} /> Import</button>
          <button type="button" className="mobile-editor-button subtle" onClick={onOpenSourceFiles} disabled={!onOpenSourceFiles}><Icon name="file-code" size={14} /> Source files</button>
          <button type="button" className="mobile-editor-button subtle" onClick={() => setFlowPreviewId(flowScreen?.id ?? null)} disabled={!flowScreen}><Icon name="play" size={14} /> Preview flow</button>
          <div className="mobile-export-control">
            <button type="button" className="mobile-editor-button subtle" onClick={() => setExportOpen((open) => !open)} disabled={exportBusy !== null}><Icon name="download" size={14} /> Export <Icon name="chevron-down" size={12} /></button>
            {exportOpen ? <div className="mobile-export-menu" role="menu"><button type="button" role="menuitem" onClick={() => void exportHtmlScreens()}><Icon name="file-code" size={13} /> HTML screens (.zip)</button><button type="button" role="menuitem" onClick={() => void exportPngScreens()}><Icon name="image" size={13} /> PNG screens (.zip)</button><button type="button" role="menuitem" onClick={exportSpa}><Icon name="globe" size={13} /> Runnable SPA (.zip)</button></div> : null}
          </div>
          <button type="button" className="mobile-editor-button primary" onClick={() => void createScreen()} disabled={viewerOnly || screens.length >= MOBILE_MAX_SCREENS || busy !== null}><Icon name="plus" size={14} /> New screen</button>
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
        <div className="mobile-canvas-shell">
          <div className="mobile-canvas-toolbar">
            <span>{selected ? <><b>{selected.name}</b><span className="mobile-selection-id">{selected.id.slice(0, 8)}</span></> : 'Select a screen'}</span>
            <div className="mobile-canvas-controls">
              <button type="button" onClick={() => setEditor((current) => ({ ...current, zoom: Math.min(1.5, current.zoom + 0.1) }))} aria-label="Zoom in"><Icon name="zoom-in" size={14} /></button>
              <span>{zoomLabel}</span>
              <button type="button" onClick={() => setEditor((current) => ({ ...current, zoom: Math.max(0.35, current.zoom - 0.1) }))} aria-label="Zoom out"><Icon name="zoom-out" size={14} /></button>
              <button type="button" onClick={() => setEditor(DEFAULT_EDITOR)}>Reset view</button>
            </div>
          </div>
          <div
            className="mobile-canvas-viewport"
            onPointerDown={(event) => {
              if (event.target !== event.currentTarget) return;
              panRef.current = { x: editor.x, y: editor.y, startX: event.clientX, startY: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = panRef.current;
              if (!start) return;
              setEditor((current) => ({ ...current, x: start.x + event.clientX - start.startX, y: start.y + event.clientY - start.startY }));
            }}
            onPointerUp={() => { panRef.current = null; }}
            onPointerCancel={() => { panRef.current = null; }}
          >
            <div className="mobile-canvas-world" style={{ transform: `translate(${editor.x}px, ${editor.y}px) scale(${editor.zoom})` }}>
              {screens.map((screen) => {
                const html = sources[screen.id] ?? '';
                const srcDoc = html ? buildSrcdoc(htmlWithMobileRouteBridge(html, screen.id), { baseHref: projectRawUrl(projectId, screen.file, workspaceContext) }) : '';
                return (
                  <article
                    key={screen.id}
                    className={`mobile-device-frame${selected?.id === screen.id ? ' selected' : ''}`}
                    style={{ left: dragPositions[screen.id]?.x ?? screen.x, top: dragPositions[screen.id]?.y ?? screen.y, width: screen.width + 24 }}
                    onClick={() => selectScreen(screen)}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      selectScreen(screen);
                      if (viewerOnly) return;
                      screenDragRef.current = { id: screen.id, x: screen.x, y: screen.y, startX: event.clientX, startY: event.clientY };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      const drag = screenDragRef.current;
                      if (!drag || drag.id !== screen.id) return;
                      setDragPositions((current) => ({ ...current, [screen.id]: { x: Math.max(0, drag.x + (event.clientX - drag.startX) / editor.zoom), y: Math.max(0, drag.y + (event.clientY - drag.startY) / editor.zoom) } }));
                    }}
                    onPointerUp={(event) => {
                      const drag = screenDragRef.current;
                      if (!drag || drag.id !== screen.id) return;
                      screenDragRef.current = null;
                      const nextPosition = { x: Math.max(0, drag.x + (event.clientX - drag.startX) / editor.zoom), y: Math.max(0, drag.y + (event.clientY - drag.startY) / editor.zoom) };
                      const moved = Math.abs(event.clientX - drag.startX) > 2 || Math.abs(event.clientY - drag.startY) > 2;
                      const candidate = { ...screen, ...nextPosition };
                      setDragPositions((current) => { const next = { ...current }; delete next[screen.id]; return next; });
                      if (!moved) return;
                      const overlaps = screens.some((other) => other.id !== screen.id && mobileScreenRecordsOverlap(candidate, other));
                      if (overlaps) {
                        setError('Screens cannot overlap. Choose an open canvas position.');
                        return;
                      }
                      persist(screens.map((other) => other.id === screen.id ? { ...other, ...nextPosition, updatedAt: now() } : other), screen.id);
                    }}
                    onPointerCancel={() => {
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
          </div>
        </div>
        <aside className="mobile-screen-inspector" aria-label="Selected screen actions">
          {selected ? <>
            <div className="mobile-inspector-kicker">Selected screen</div>
            <h3>{selected.name}</h3>
            <code>{selected.file}</code>
            <div className="mobile-inspector-meta"><span>Stable ID</span><strong>{selected.id}</strong></div>
            <div className="mobile-inspector-meta"><span>Frame</span><strong>{selected.deviceFrame} · {selected.width}×{selected.height}</strong></div>
            <div className="mobile-inspector-fields">
              <label><span>Device frame</span><select value={selected.deviceFrame} disabled={viewerOnly} onChange={(event) => updateSelectedScreen({ deviceFrame: event.target.value as MobileScreenRecord['deviceFrame'] })}><option value="generic-phone">Generic phone</option><option value="iphone">iPhone</option><option value="android">Android</option><option value="tablet">Tablet</option></select></label>
              <label><span>Orientation</span><select value={selected.orientation} disabled={viewerOnly} onChange={(event) => { const orientation = event.target.value as MobileScreenRecord['orientation']; updateSelectedScreen({ orientation, width: orientation === 'portrait' ? 390 : 844, height: orientation === 'portrait' ? 844 : 390 }); }}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
              <label><span>Transition</span><select value={selected.transition ?? 'none'} disabled={viewerOnly} onChange={(event) => updateSelectedScreen({ transition: event.target.value as MobileScreenRecord['transition'] })}><option value="none">None</option><option value="fade">Fade</option><option value="slide-left">Slide left</option><option value="slide-right">Slide right</option><option value="modal">Modal</option></select></label>
            </div>
            <div className="mobile-inspector-actions">
              <button type="button" onClick={() => onOpenFile?.(selected.file)} disabled={!onOpenFile}><Icon name="edit" size={14} /> Visual edit</button>
              <button type="button" onClick={() => void renameScreen()} disabled={viewerOnly || busy !== null}><Icon name="pencil" size={14} /> Rename</button>
              <button type="button" onClick={() => void duplicateScreen()} disabled={viewerOnly || busy !== null || screens.length >= MOBILE_MAX_SCREENS}><Icon name="copy" size={14} /> Duplicate</button>
              <button type="button" onClick={() => reorder(-1)} disabled={viewerOnly || selected.order === 0}><Icon name="arrow-up" size={14} /> Move earlier</button>
              <button type="button" onClick={() => reorder(1)} disabled={viewerOnly || selected.order >= screens.length - 1}><Icon name="chevron-down" size={14} /> Move later</button>
              <button type="button" className="danger" onClick={() => void deleteScreen()} disabled={viewerOnly || screens.length <= 1 || busy !== null}><Icon name="trash" size={14} /> Delete screen</button>
            </div>
          </> : <div className="mobile-inspector-empty">Click inside a screen to select it and attach it to the next prompt.</div>}
        </aside>
      </div>
      {flowPreviewId && flowScreen ? (
        <div className="mobile-flow-modal" role="dialog" aria-modal="true" aria-label="Mobile flow preview">
          <div className="mobile-flow-backdrop" onClick={() => setFlowPreviewId(null)} />
          <div className="mobile-flow-dialog">
            <div className="mobile-flow-header"><div><strong>Flow preview</strong><span>Tap links to move through the experience</span></div><button type="button" onClick={() => setFlowPreviewId(null)} aria-label="Close flow preview"><Icon name="close" size={16} /></button></div>
            <div key={flowScreen.id} className={`mobile-flow-device transition-${flowScreen.transition ?? 'none'}`}><div className="mobile-device-chrome"><span>{flowScreen.name}</span><span>simulated device</span></div><div className="mobile-device-screen"><iframe ref={flowFrameRef} title={`${flowScreen.name} flow preview`} sandbox="allow-scripts allow-forms" srcDoc={flowHtml ? buildSrcdoc(htmlWithMobileRouteBridge(flowHtml, flowScreen.id), { baseHref: projectRawUrl(projectId, flowScreen.file, workspaceContext) }) : ''} /></div></div>
            <div className="mobile-flow-footer"><span>{screens.findIndex((screen) => screen.id === flowScreen.id) + 1} / {screens.length}</span><div>{screens.map((screen) => <button key={screen.id} type="button" className={screen.id === flowScreen.id ? 'active' : ''} onClick={() => { setFlowPreviewId(screen.id); selectScreen(screen); }}>{screen.name}</button>)}</div></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
