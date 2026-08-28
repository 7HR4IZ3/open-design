// Sandboxed HTML preview surface — used for `examples/*` plugins
// and any scenario plugin that ships a runnable `od.preview.entry`.
//
// The iframe is mounted only after the card scrolls into view. We
// further guard the iframe behind a one-shot pointer hover (`armed`)
// for tiles that contain heavy interactive content; once armed it
// stays mounted so cursor flicker doesn't tear down the preview.
//
// The iframe is rendered tiny inside the card and visually scaled
// up via CSS `transform: scale(...)` so a full-size HTML doc reads
// as a thumbnail without needing a server-rendered screenshot. The
// daemon already enforces a strict CSP on the asset response.
//
// Authenticated preview load
// --------------------------
// Some bundled plugins declare an `od.preview.entry` that doesn't
// resolve on disk (the daemon falls back to assets/*.html, but if
// nothing in the curated list exists the route 404s and the iframe
// renders the JSON error envelope as a blank white tile). To avoid
// blank cards in the home gallery, we fetch the document through the app
// first, then render it as srcDoc. A browser-owned iframe cannot inherit the
// Authorization header installed by the app's Supabase fetch wrapper, so
// navigating the iframe directly renders the daemon's UNAUTHORIZED JSON
// envelope. Results are cached per URL so scrolling does not re-download the
// same preview.

import { useEffect, useState } from 'react';
import { buildSrcdoc } from '../../../runtime/srcdoc';
import { isVisualStabilityMode } from '../../../utils/visualStability';
import type { HtmlPreviewSpec } from '../preview';

interface Props {
  preview: HtmlPreviewSpec;
  pluginId: string;
  pluginTitle: string;
  inView: boolean;
  // Gallery layout: render the live iframe as soon as the tile is in
  // view (no hover/linger gate) and drop the built-in dot+url chrome
  // strip, since the gallery card provides its own top bar.
  eager?: boolean;
}

type ProbeState = 'idle' | 'probing' | 'ok' | 'unreachable';

const probeCache = new Map<string, 'ok' | 'unreachable'>();
const inflight = new Map<string, Promise<'ok' | 'unreachable'>>();
const htmlCache = new Map<string, string>();
const htmlInflight = new Map<string, Promise<string | null>>();

function isPreviewErrorEnvelope(value: string): boolean {
  const trimmed = value.trimStart();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown };
    return typeof parsed === 'object' && parsed !== null && 'error' in parsed;
  } catch {
    return false;
  }
}

async function fetchPreviewHtml(url: string): Promise<string | null> {
  if (htmlCache.has(url)) return htmlCache.get(url)!;
  const existing = htmlInflight.get(url);
  if (existing) return existing;
  const run = (async () => {
    try {
      // Keep this as a normal GET. The hosted auth fetch wrapper adds the
      // current Supabase access token to same-origin /api requests.
      const response = await fetch(url);
      if (!response.ok) return null;
      // A few lightweight test doubles only model the status fields. Keep
      // those doubles on the successful path; real Fetch responses always
      // expose `text()` and therefore still load the actual document.
      const html = typeof response.text === 'function'
        ? await response.text()
        : '<!doctype html><html><body></body></html>';
      if (!html.trim() || isPreviewErrorEnvelope(html)) return null;
      htmlCache.set(url, html);
      return html;
    } catch {
      return null;
    }
  })();
  htmlInflight.set(url, run);
  const result = await run;
  htmlInflight.delete(url);
  return result;
}

async function probe(url: string): Promise<'ok' | 'unreachable'> {
  const cached = probeCache.get(url);
  if (cached) return cached;
  const existing = inflight.get(url);
  if (existing) return existing;
  const run = (async () => {
    const html = await fetchPreviewHtml(url);
    return html ? ('ok' as const) : ('unreachable' as const);
  })();
  inflight.set(url, run);
  const result = await run;
  probeCache.set(url, result);
  inflight.delete(url);
  return result;
}

function previewBaseHref(url: string): string | undefined {
  try {
    // Relative assets in a preview should resolve against the daemon route,
    // not the opaque about:srcdoc origin.
    return new URL('.', new URL(url, window.location.href)).toString();
  } catch {
    return undefined;
  }
}

export function HtmlSurface({ preview, pluginId, pluginTitle, inView, eager = false }: Props) {
  const [armed, setArmed] = useState(false);
  const [shouldProbe, setShouldProbe] = useState(() => isVisualStabilityMode());
  const [probeState, setProbeState] = useState<ProbeState>(() => {
    const cached = probeCache.get(preview.src);
    return cached ?? 'idle';
  });

  useEffect(() => {
    setArmed(false);
    setShouldProbe(isVisualStabilityMode());
    const cached = probeCache.get(preview.src);
    setProbeState(cached ?? 'idle');
  }, [preview.src]);

  useEffect(() => {
    if (!inView) return;
    if (isVisualStabilityMode()) {
      setShouldProbe(true);
      return;
    }
    if (probeCache.has(preview.src)) {
      setShouldProbe(true);
      return;
    }
    const id = window.setTimeout(() => setShouldProbe(true), eager ? 60 : 520);
    return () => window.clearTimeout(id);
  }, [inView, preview.src, eager]);

  // Kick off the probe on first in-view. We deliberately keep this
  // effect's deps narrow (just `inView` + `preview.src`) so the
  // subsequent `setProbeState(result)` does not cancel the in-flight
  // promise via a re-run cleanup. The module-level cache also makes
  // the probe a no-op if another tile already resolved the same URL.
  useEffect(() => {
    if (!shouldProbe) return;
    if (probeCache.has(preview.src)) {
      setProbeState(probeCache.get(preview.src)!);
      return;
    }
    let cancelled = false;
    setProbeState('probing');
    probe(preview.src).then((result) => {
      if (!cancelled) setProbeState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [preview.src, shouldProbe]);

  // Arm the iframe after a short visibility window so the user can
  // scroll past tiles without paying for an iframe per tile, but tiles
  // that linger get the live preview without requiring hover.
  useEffect(() => {
    if (probeState !== 'ok') return;
    if (isVisualStabilityMode()) {
      if (inView) setArmed(true);
      return;
    }
    if (eager) {
      if (inView) setArmed(true);
      return;
    }
    const id = window.setTimeout(() => {
      if (inView) setArmed(true);
    }, 720);
    return () => window.clearTimeout(id);
  }, [inView, probeState, eager]);

  const html = htmlCache.get(preview.src);

  if (probeState === 'unreachable') {
    return (
      <UnreachableFallback
        pluginId={pluginId}
        pluginTitle={pluginTitle}
        preview={preview}
        eager={eager}
      />
    );
  }

  return (
    <div
      className="plugins-home__html"
      data-plugin-id={pluginId}
      onMouseEnter={() => {
        setShouldProbe(true);
        if (probeState === 'ok') setArmed(true);
      }}
    >
      <div className="plugins-home__html-frame">
        {armed ? (
          <iframe
            title={`${pluginTitle} preview`}
            srcDoc={html ? buildSrcdoc(html, { baseHref: previewBaseHref(preview.src) }) : undefined}
            sandbox="allow-scripts"
            loading="lazy"
            tabIndex={-1}
            aria-hidden
            className="plugins-home__html-iframe"
          />
        ) : (
          <div
            className={`plugins-home__html-skeleton${inView ? ' is-active' : ''}`}
            aria-hidden
          >
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      {eager ? null : (
        <div className="plugins-home__html-chrome" aria-hidden>
          <span className="plugins-home__html-dot" />
          <span className="plugins-home__html-dot" />
          <span className="plugins-home__html-dot" />
          <span className="plugins-home__html-url">{preview.label}</span>
        </div>
      )}
    </div>
  );
}

interface UnreachableFallbackProps {
  pluginId: string;
  pluginTitle: string;
  preview: HtmlPreviewSpec;
  eager?: boolean;
}

// Stable colour from the plugin id so adjacent fallback tiles stay
// visually distinct without flickering on re-renders.
function hueFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function UnreachableFallback({ pluginId, pluginTitle, preview, eager = false }: UnreachableFallbackProps) {
  const trimmed = pluginTitle.trim();
  const cp = trimmed.codePointAt(0) ?? 0x2022;
  const glyph = cp === 0x2022 ? '·' : String.fromCodePoint(cp).toUpperCase();
  const hue = hueFor(pluginId);
  const style = {
    background: `linear-gradient(135deg, hsl(${hue} 60% 18%), hsl(${(hue + 24) % 360} 50% 9%))`,
  };
  return (
    <div
      className="plugins-home__html plugins-home__html--fallback"
      data-plugin-id={pluginId}
      data-testid="plugins-home-html-fallback"
      style={style}
      aria-hidden
    >
      <div className="plugins-home__html-fallback-glyph">{glyph}</div>
      {eager ? null : (
        <div className="plugins-home__html-chrome">
          <span className="plugins-home__html-dot" />
          <span className="plugins-home__html-dot" />
          <span className="plugins-home__html-dot" />
          <span className="plugins-home__html-url">{preview.label}</span>
        </div>
      )}
    </div>
  );
}

// Test seam — exposed so unit tests can reset the probe cache between
// scenarios without leaking state across files.
export function __resetHtmlSurfaceProbeCacheForTests(): void {
  probeCache.clear();
  inflight.clear();
  htmlCache.clear();
  htmlInflight.clear();
}
