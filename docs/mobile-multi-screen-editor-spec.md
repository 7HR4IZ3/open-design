# Mobile Multi-Screen Editor

Status: approved for implementation

## Intent

Make the mobile editor a first-class project workspace, with the same shell and project-level actions as the desktop workspace. A mobile project should let a user move between the mobile canvas, Design Files, browser tabs, documents, and terminals without losing the selected screen context.

## Agreed decisions

- The mobile canvas is a workspace tab, alongside `Design Files`, browser tabs, documents, and other workspace tabs.
- `Design Files` remains available in mobile projects.
- `Open as design file` opens the selected screen in the existing HTML file tab and initializes that preview to the mobile viewport. It does not create a second viewer implementation.
- Project-level export lives on the mobile canvas. Version history remains a per-file action in the normal design-file viewer.
- The canonical mobile contracts and `.od/mobile-manifest.json` are the source of truth. Legacy manifest formats are read only through an adapter/migration path.
- The selected mobile screen remains the active agent/workspace context when the canvas tab is active.
- Primary actions use the existing desktop text-plus-icon treatment. Compact canvas controls use icons with accessible labels/tooltips.

## Workspace behavior

Add a stable special tab identifier, `__mobile_canvas__`, to the existing project tab state. The tab is available only for mobile editor projects and is the default active tab when a mobile project has no saved tab selection. Existing saved tabs remain valid.

The mobile workspace should expose, in the normal workspace order:

1. Mobile Canvas
2. Design Files
3. Any saved browser, document, sketch, terminal, or file tabs

The existing `FileWorkspace` owns the tab strip and header action portal. The mobile canvas is rendered as another special body branch rather than replacing `FileWorkspace` at the project level.

## Canvas controls

The canvas header follows the desktop workspace visual language and contains:

- `New screen`
- `Open as design file` for the selected screen
- `Export` for project-level exports
- `Version history` guidance/action for the selected screen when a file is selected; the actual history panel is provided by the existing file viewer
- `Fullscreen`, using the browser Fullscreen API for the canvas surface with a focus-mode fallback

The canvas navigation toolbar contains accessible icon controls for:

- select mode and pan mode
- snap to grid
- center selected screen
- fit all screens
- zoom out, current zoom, and zoom in

Defaults:

- 8 px grid
- snap to grid off by default
- zoom range 35%–150%
- center/fit actions preserve the selected screen and agent context
- clicking the minimap centers the canvas on the corresponding point

Screen manipulation remains available in select mode. Pan mode changes pointer behavior without changing screen data. Snapping applies to screen placement and is applied before overlap validation. Keyboard focus and buttons must remain usable when the canvas has no screens.

## Minimap

Render a compact minimap in the bottom-right of the canvas. It shows the relative bounds of all screens and the current viewport rectangle. The selected screen uses the existing accent color. The minimap is an interaction aid only; it must not become another source of screen geometry or selection state.

## Data model and migration

Use `MobileEditorMetadata`, `MobileManifest`, and `MobileScreenRecord` from `@open-design/contracts`. The editor must preserve stable screen IDs, order, geometry, dimensions, orientation, device-frame preference, transition metadata, and timestamps.

`apps/web/src/mobile/mobile-screens.ts` should become a compatibility adapter: read the canonical manifest first, translate legacy records when needed, and write canonical records. Do not allow the old fallback manifest to overwrite a canonical manifest during normal saves.

When the project metadata is available, keep its mobile editor metadata synchronized with the canonical manifest so prompts and agents can discover the same screen set as the UI. Writes must remain safe for read-only/viewer sessions.

## Design-file opening

Opening a screen as a design file calls the existing workspace file-opening path with the screen's HTML file. The file viewer receives an optional initial viewport preference and seeds the HTML preview to `mobile` only when the open request explicitly came from the mobile canvas. Subsequent user viewport changes are preserved and are not overwritten by unrelated renders.

The ordinary design-file header supplies the established Present, Version History, Export, and Share actions. This keeps mobile and desktop file workflows consistent.

## Export behavior

The canvas export menu provides the existing mobile project outputs:

- HTML screens archive
- PNG screens archive
- runnable SPA archive

Exports use the canonical manifest and selected screen ordering. Export remains disabled or read-only according to the existing project permissions. File-level export continues to be handled by the design-file viewer.

## Implementation sequence

1. Add the stable mobile-canvas workspace tab and render the existing workspace shell for mobile projects.
2. Consolidate the active canvas around the canonical mobile contracts and adapter.
3. Add desktop-aligned actions, select/pan, snapping, centering, fullscreen, zoom controls, and minimap.
4. Add the mobile-canvas-to-design-file callback and initial mobile viewport plumbing.
5. Add focused component/contract tests and run lint, tests, and the production web build.
6. Verify the Docker/Render build path separately when the local web build is green.

## Acceptance criteria

- A mobile project opens with a visible Mobile Canvas tab and retains Design Files beside it.
- Switching tabs does not lose the selected screen or its workspace context.
- A selected screen opens in the standard HTML design-file tab with mobile preview selected initially.
- Export, fullscreen, zoom, fit, center, select/pan, snapping, and minimap interactions are keyboard-accessible and visually consistent with the desktop workspace.
- Screen records round-trip through `.od/mobile-manifest.json` using the canonical schema without losing IDs or geometry.
- Existing desktop projects and ordinary file tabs are unchanged.
- Local lint/tests/build pass, and the same source tree can be used by the Render Docker build.

## Test plan

- Contract tests for canonical read/write, legacy migration, stable IDs, snapping, and overlap validation.
- Component tests for tab visibility/default selection, screen opening, control state, minimap interaction, and read-only behavior.
- File viewer tests for mobile initial viewport without regressions to persisted manual viewport changes.
- Production `@open-design/web` build plus the repository's relevant lint/test commands.
