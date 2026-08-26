import type { ProjectMetadata } from '../api/projects.js';

/**
 * The mobile editor contract is kept as a small, late prompt section so the
 * project-level mode overrides generic web-artifact habits without changing
 * the existing web prompt for legacy projects.
 */
export function renderMobileMultiScreenPrompt(metadata?: ProjectMetadata | null): string {
  if (metadata?.platformMode !== 'mobile') return '';
  const manifest = metadata.mobileEditor;
  const inventory = manifest?.screens?.length
    ? 'The current manifest contains ' + manifest.screens.length + ' screens; preserve each stable id and file unless the user explicitly requests a mutation.'
    : 'The current manifest is not populated yet; create at least one screen during the first build.';
  return [
    '## Mobile multi-screen editor contract',
    '',
    'This is a generic mobile UI project. Build self-contained HTML/CSS/JS screen files and use the project manifest at .od/mobile-manifest.json as the source of truth for screen identity, order, canvas position, dimensions, orientation, device-frame choice, routes, and transitions. ' + inventory,
    '',
    '- Deliver each user-facing screen as its own project-relative HTML file. Shared CSS, JavaScript, fonts, and images may live in project-relative shared/ or assets/ paths, but never collapse a multi-screen flow into one page or a designer-only selector.',
    '- Every screen record needs a stable id, semantic name, safe HTML path, order, x/y canvas position, width/height, portrait or landscape orientation, decorative device-frame choice, created/updated timestamps, and route metadata when it participates in navigation. Keep one to 100 screens and keep their canvas rectangles non-overlapping.',
    '- Treat mobile as a phone-first product: use 44px or larger touch targets with comfortable spacing, safe-area insets, readable mobile type, resilient wrapping, predictable back and bottom-tab navigation, keyboard-aware layouts, accessible labels/focus, reduced-motion support, and no interaction that depends only on desktop hover.',
    '- Implement meaningful loading, empty, error, disabled, success, and transition states where the flow calls for them. Prefer CSS/JS transitions that respect prefers-reduced-motion; device chrome belongs to the editor/preview and must not appear as authored product UI.',
    '- Preserve stable ids across edits, renames, duplication, reordering, and visual changes. Create, rename, duplicate, reorder, and delete screens as coordinated file + manifest mutations; deleting the final screen is not allowed and deletion requires explicit confirmation in the host UI.',
    '- Resolve links and buttons using data-screen-id, route keys, or project-relative HTML paths. When a destination is known, the editor and flow preview select and bring that screen into view. External links keep normal browser behavior.',
    '- Read the manifest and the relevant screen source before editing. A selected screen is the default target, not a restriction: explicit multi-screen requests may create or edit any screen. After mutations, report compact metadata containing project id, affected screens and actions, selected screen id, and whether the manifest was updated.',
  ].join('\n');
}
