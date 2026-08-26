# Mobile multi-screen editor

Status: implementation specification
Branch: `feature/mobile-multi-screen-editor`
Owner: OpenDesign web + daemon
Reference: [Google Stitch](https://stitch.withgoogle.com/)

## 1. Summary

OpenDesign projects currently treat an HTML prototype as one primary preview
surface. This feature adds a permanent project-level platform choice and a
mobile project editor that treats a product as a collection of independently
editable HTML screens arranged on an infinite canvas.

The mobile editor keeps the existing OpenDesign artifact model: every screen is
a self-contained HTML/CSS/JS document, can reference shared project assets, is
previewed in an isolated sandboxed iframe, and remains available as source in
the project file browser. The editor adds project metadata and UI orchestration;
it does not replace the files or the existing web editor.

The first milestone contains all three product slices:

1. project-level Web/Mobile creation and mobile-aware agent generation;
2. a persistent multi-screen canvas with source/file management and
   selection-aware editing;
3. navigable mobile-flow preview, screen links, and initial import/export
   affordances.

## 2. Product decisions

### 2.1 Platform

- Platform is selected once on the New Project screen and is stored on the
  project. It is not a per-turn toggle.
- The supported first-class choices are `web` and `mobile`.
- Existing projects, imported projects, and projects created through legacy
  callers default to `web` when no platform is present.
- Switching a project from Web to Mobile is not required for this milestone.
  The project does not need a migration or conversion wizard.
- The existing detailed target-platform fields remain compatible. A mobile
  project may carry iOS, Android, or neutral mobile device preferences, but the
  editor mode is determined by the project-level platform.
- Mobile means a generic mobile UI. It is not limited to iOS or Android and
  must not pretend that decorative device chrome is native operating-system
  behavior.

### 2.2 Authoring model

- Each user-facing screen is a separate `.html` file.
- Each screen is self-contained HTML/CSS/JS. Shared assets are allowed through
  project-relative paths, for example `assets/logo.svg`, `shared/theme.css`,
  and `shared/navigation.js`.
- The agent may create intermediate/supporting files to avoid repetition, but
  must keep user-facing screens separately addressable.
- A project must contain at least one screen.
- A mobile project may contain up to 100 screens.
- A first generation should create multiple screens when the brief describes a
  flow or app. A user may also explicitly request one screen.
- The agent may freely create additional screens during later turns and may
  modify any screen when the user asks for a multi-screen change.
- Screen order is presentation/editor order, not a limitation on navigation.

### 2.3 Screen identity and metadata

- Every screen has a stable id, generated once and preserved across rename,
  reorder, duplication, and content edits.
- The project manifest is the source of truth for screen identity, ordering,
  canvas position, device frame, orientation, and optional navigation metadata.
- The manifest is project-wide. Version/change history remains project-wide,
  while existing file-version history continues to provide per-file undo and
  restore.
- If a screen file is renamed or deleted outside OpenDesign, a refresh removes
  the stale screen entry from the manifest and continues with the remaining
  valid screens. It must not block the project from opening.
- If an external rename can be matched by stable manifest id in a future
  integration, the implementation may preserve the id; the initial milestone
  only guarantees safe stale-entry removal.

### 2.4 Canvas

- Mobile projects open in an infinite canvas editor.
- The canvas viewport and camera position persist per project in the project
  manifest or a project-scoped editor-state record.
- Screens never overlap. New screens are placed in the first available grid
  slot; manual move operations snap or resolve away from collisions.
- Each screen is rendered in its own isolated iframe/frame. A screen's authored
  content cannot directly share DOM state with another screen.
- A device frame may be selected per screen. Device chrome is decorative only;
  it is never injected into the authored HTML and never presented as app UI.
- The editor supports at least portrait and landscape orientations and stores
  width, height, and orientation in screen metadata.
- Clicking on the frame, its chrome, or anywhere inside its iframe selects that
  screen. The selected frame has a visible selection border and accessible
  selected state.
- Canvas zoom, pan, and selection must stay usable with up to 100 screens. Only
  visible/nearby frames should mount full live iframes; off-screen frames may
  use thumbnails or a lightweight preview.

### 2.5 Chat and selection

- A selected screen is shown in the existing composer as an attachment-style
  selection chip/indicator. It is not rendered as a file upload attachment and
  does not reuse the existing file/image attachment upload UI.
- The selection indicator identifies the screen name and stable id and has a
  remove/clear action.
- With no selected screen, a request applies to the overall project.
- With one selected screen, the selection is included in the agent context and
  the default edit target is that screen's HTML file.
- Users can still explicitly ask to edit other screens; selection is a target
  hint, not a restriction.
- Multi-screen prompts are first-class. The agent receives the selected screen
  plus a compact manifest summary and can select/create/reorder/rename/duplicate
  screens to satisfy the request.
- Selection is represented in the same request context channel as other
  structured project context, not by pretending the screen is a binary
  attachment.

### 2.6 Navigation and flows

- Screens may declare links/buttons that route to another screen.
- The initial implementation uses iframe injection/postMessage interception to
  resolve links and buttons to screen ids. It does not require an explicit
  visual connection line on the canvas.
- When a screen link is activated in the canvas, the destination screen is
  selected and the canvas pans it into view.
- The destination screen may also be opened in the dedicated flow preview.
- A project gets a dedicated flow-preview page/surface that runs the screens in
  a single simulated device. It supports screen-to-screen navigation and
  authored animations/transitions where possible.
- The flow preview is a presentation surface; it does not mutate canvas
  positions or screen source.

### 2.7 Design constraints for generated mobile UI

The mobile system prompt must make the following explicit and enforceable:

- touch targets and comfortable hit areas;
- safe-area insets and device cutouts;
- mobile typography, readable line lengths, and dynamic text resilience;
- native navigation patterns appropriate to a generic mobile app;
- bottom tabs where the information architecture calls for them;
- keyboard, focus, input, and viewport-resize behavior;
- portrait-first layout while honoring stored landscape dimensions;
- accessible labels, contrast, focus, reduced motion, and screen-reader order;
- no desktop-only hover interactions as the only way to discover or operate a
  control;
- intentional loading, empty, error, disabled, and success states;
- scroll ownership, sticky headers, bottom actions, and gesture-safe spacing;
- back behavior and predictable route transitions;
- performance appropriate for a phone viewport;
- self-contained HTML/CSS/JS with project-relative shared assets;
- separate files for distinct screens and an updated project manifest.

## 3. Data contract

### 3.1 Project metadata

Extend `ProjectMetadata` with a backward-compatible project-level field:

```ts
type ProjectPlatformMode = 'web' | 'mobile';

interface ProjectMetadata {
  // existing fields …
  platformMode?: ProjectPlatformMode;
  mobileEditor?: MobileEditorMetadata;
}
```

`platformMode` is optional in storage for compatibility and resolves to `web`
when missing. New projects always persist it. `platform` and
`platformTargets` remain available for existing platform-specific prompt
behavior; mobile UI uses `platformMode === 'mobile'` as the authoritative
editor switch.

### 3.2 Mobile manifest

The manifest is stored as a reserved project file at
`.od/mobile-manifest.json` and is never shown as a user-facing screen. The
daemon may materialize it atomically alongside screen writes.

```ts
const MOBILE_MANIFEST_SCHEMA = 'open-design.mobile-manifest.v1';

type MobileOrientation = 'portrait' | 'landscape';

type MobileDeviceFrame =
  | 'generic-phone'
  | 'iphone'
  | 'android'
  | 'tablet';

interface MobileScreenRecord {
  id: string;                 // stable UUID-like id
  file: string;               // project-relative .html path
  name: string;               // user-facing label
  order: number;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: MobileOrientation;
  deviceFrame: MobileDeviceFrame;
  transition?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'modal';
  routeKey?: string;
  createdAt: number;
  updatedAt: number;
}

interface MobileEditorState {
  x: number;                  // camera/world offset
  y: number;
  zoom: number;
}

interface MobileEditorMetadata {
  schemaVersion: 1;
  manifestFile: '.od/mobile-manifest.json';
  screens: MobileScreenRecord[];
  editor: MobileEditorState;
  selectedScreenId?: string | null;
  maxScreens: 100;
  updatedAt: number;
}

interface MobileManifest {
  schema: typeof MOBILE_MANIFEST_SCHEMA;
  projectId: string;
  screens: MobileScreenRecord[];
  editor: MobileEditorState;
  updatedAt: number;
}
```

The exact storage shape may be refined during implementation if the existing
daemon project metadata conventions make a sidecar manifest safer than
embedding the full list in `ProjectMetadata`. The invariant is that the
manifest is durable, project-owned, updated on screen operations, and
recoverable when files are missing.

### 3.3 Screen file rules

- Screen paths must remain project-relative and pass the daemon's existing
  path-safety checks.
- Generated screen files should use semantic names such as
  `screens/home.html`, `screens/search.html`, and `screens/profile.html`.
- Screen files must not be placed under `.od/`, `.live-artifacts/`, or other
  internal storage directories.
- `shared/` and `assets/` are valid supporting-file conventions.
- `index.html` may be a launcher/overview for a multi-screen project, but it
  must not be the only representation of the screens.
- A screen delete is refused when it would leave zero screens.

## 4. Operations

The web client should expose these operations through a small screen-domain
module and reuse existing file APIs where possible:

| Operation | File effect | Manifest effect | Confirmation |
| --- | --- | --- | --- |
| Create screen | Create a self-contained HTML file | Add new stable record and non-overlapping position | No |
| Rename screen | Rename HTML file | Update `name` and `file`, preserve id | No |
| Duplicate screen | Copy HTML file and supporting references | Add new stable record, preserve source layout intent without overlap | No |
| Reorder screens | None | Update `order` values | No |
| Move screen | None | Update `x`/`y`, resolve collision | No |
| Delete screen | Delete HTML file | Remove record | Yes; never allow zero |
| Edit screen | Save HTML/version | Update `updatedAt` | No |
| Repair manifest | None or remove stale records | Reconcile file existence | No |

Delete confirmation must identify the screen by name and explain that its HTML
file and canvas entry will be removed. Existing project-wide history remains
available for restoration where the current file-version system supports it.

## 5. New Project flow

The New Project screen adds a prominent, single-select Web/Mobile choice near
the project name and creation intent. The selection is part of `CreateInput`
metadata and is sent in the existing project create request.

Mobile selection should:

- explain that it creates a multi-screen mobile editor;
- default the initial device to a neutral phone frame;
- keep platform-target details optional and generic;
- preserve the existing Web creation path unchanged apart from persisting
  `platformMode: 'web'` for new projects;
- seed at least one screen for an empty mobile project before the first agent
  turn, unless an import already supplies screens;
- choose the mobile skill/system prompt automatically while allowing the
  existing skill selection to remain visible and additive.

## 6. Agent contract

### 6.1 Dedicated skill

Add a dedicated functional skill based on the existing frontend/prototype
prompt, named `mobile-multi-screen-editor`. Its body must describe:

- mobile product and flow planning;
- screen-file-first delivery;
- manifest maintenance;
- screen operations and the delete confirmation boundary;
- selection-aware editing;
- self-contained screen implementation;
- shared assets and shared support files;
- navigation metadata and route behavior;
- mobile craft/accessibility requirements;
- the requirement to return screen metadata after mutations.

The skill is project-aware and should be injected automatically for mobile
projects. It must not require CLI support.

### 6.2 System prompt

Add a stable mobile addendum to the daemon/contracts prompt composition. It
must include:

- project platform mode;
- manifest path and current screen inventory;
- selected screen id/name/file, when present;
- explicit distinction between selected target and permission to edit other
  screens;
- the screen operation contract;
- the mobile craft checklist;
- output metadata requirements.

The prompt must not instruct the agent to render editor metadata, canvas labels,
device selectors, or design-process controls inside the authored product UI.

### 6.3 Response metadata

After a mobile generation or screen mutation, the agent/runtime should return a
machine-readable summary suitable for the UI:

```ts
interface MobileScreenMutationMetadata {
  projectId: string;
  screens: Array<{
    id: string;
    file: string;
    name: string;
    action: 'created' | 'updated' | 'renamed' | 'duplicated' | 'reordered' | 'deleted';
  }>;
  selectedScreenId?: string | null;
  manifestUpdated: boolean;
}
```

The UI may derive this from the refreshed manifest when a provider does not
return an explicit payload, but the prompt contract should request it so future
agents can report it directly.

## 7. Canvas editor UI

The mobile workspace is a three-region composition:

1. a compact screen navigator/file-browser rail listing all screens and source
   files;
2. an infinite canvas containing isolated device frames;
3. the existing chat/composer surface, with the selected-screen indicator.

The screen rail supports search, create, rename, duplicate, reorder, delete,
and open-source actions. Shared files remain visible in a file-browser view but
are not presented as mobile screens unless listed in the manifest.

Each frame includes:

- a decorative device chrome/header;
- the screen name and optional route label outside the authored viewport;
- the isolated HTML iframe;
- a selected border;
- a focusable screen-level wrapper;
- loading/error fallback that does not break neighboring frames.

Canvas controls should include zoom, fit-all, fit-selected, and a reset-camera
action. Camera state persists with a debounced save. Keyboard shortcuts may be
added for fit, zoom, delete, and duplicate, but every action must also be
available through accessible controls.

## 8. Iframe interaction bridge

Extend the existing preview bridge with a narrow mobile editor channel:

- the host sends the current screen id and flow-preview mode;
- the iframe reports trusted click targets with tag, text/aria label, href, and
  destination hint;
- the host intercepts same-project route links/buttons and resolves a target
  screen by `routeKey`, `data-screen-id`, `href`, or manifest file path;
- unresolved/external links retain normal browser behavior within the current
  preview policy;
- the host never executes authored screen scripts in the parent document;
- cross-screen communication uses postMessage with source-window checks and a
  per-mount nonce, following the existing iframe security patterns.

The bridge should support transitions by applying host-level classes in flow
preview. Authored CSS animations inside each screen remain allowed and are
preserved in canvas previews.

## 9. Import and export

### 9.1 Imports

The first milestone supports:

- an existing project/folder of HTML files;
- screenshots as visual references, staged through existing upload/library
  paths;
- Figma imports through the existing Figma import route and plugin pipeline;
- existing HTML as editable screen source where it can be safely classified.

Imported projects default to Web unless the user explicitly creates/imports into
Mobile. A future import classifier may suggest mobile, but must not silently
change the project platform.

When importing multiple HTML files into a Mobile project, create stable screen
records, choose non-overlapping positions, and preserve shared assets where
paths are valid.

### 9.2 Exports

Mobile projects support these export targets:

- a folder containing HTML screen files and shared assets;
- a folder containing PNG renders of screens;
- a runnable web prototype as a SPA with screen routing;
- experimental React Native, Swift, and Kotlin exports are planned only and are
  not part of the first milestone.

Exports must not rewrite the project manifest in place. The SPA exporter may
generate a derived route map from the manifest.

## 10. Compatibility and recovery

- Web projects keep the existing editor, preview, and file-tab behavior.
- Existing projects with no `platformMode` resolve to Web.
- Existing projects with a `mobile-ios` or `mobile-android` target but no
  `platformMode` remain Web for editor compatibility; the first explicit
  project creation choice is required to enter Mobile mode.
- Missing or malformed manifests are repaired from existing `.html` files when
  possible. Otherwise, a single valid HTML file becomes the first screen.
- Missing screen files are removed from manifest metadata during reconciliation.
- Screen deletion requires confirmation in the UI and server-side guards must
  prevent violating the one-screen minimum.
- Read-only/team-shared projects show the canvas and source but with mutation
  controls disabled according to existing project authorization.
- Project-wide undo/history is unchanged. Screen-specific undo uses the
  existing project file-version endpoints for that screen's HTML file.

## 11. API and server seams

Prefer the existing project file routes and metadata patch route. Add a narrow
screen route only where atomic manifest + file operations cannot be expressed
safely through existing APIs.

Candidate endpoints, if needed:

```text
GET   /api/projects/:id/mobile-manifest
PATCH /api/projects/:id/mobile-manifest
POST  /api/projects/:id/mobile-screens
POST  /api/projects/:id/mobile-screens/:screenId/duplicate
POST  /api/projects/:id/mobile-screens/:screenId/rename
POST  /api/projects/:id/mobile-screens/reorder
DELETE /api/projects/:id/mobile-screens/:screenId
```

The implementation should first check whether the existing `POST /files`,
`POST /files/rename`, `DELETE /files/:name`, and project metadata PATCH can be
composed with a single manifest write. Any new route must reuse existing
workspace authorization and path validation and must never trust a client-
provided absolute path.

## 12. Testing requirements

### Contracts and daemon

- `platformMode` round-trips through create, list, detail, and metadata PATCH.
- Legacy projects resolve to Web.
- Mobile prompt injection includes platform, manifest, mobile rules, and
  selection context.
- Non-mobile prompt composition is unchanged.
- Manifest schema validation rejects duplicate ids, duplicate files, unsafe
  paths, more than 100 screens, and zero screens.
- Reconciliation removes missing screen files and preserves valid records.
- Delete guards prevent deleting the last screen.
- File/manifest mutations preserve stable ids and use existing authorization.

### Web unit tests

- New Project Web/Mobile selection and payload.
- Mobile canvas selection from frame, chrome, and iframe click.
- Selection chip add/remove and clear behavior.
- No-selection project-level context.
- Screen create/rename/duplicate/reorder/delete interactions.
- Delete confirmation and one-screen minimum.
- Non-overlapping placement and camera persistence.
- Missing external file reconciliation.
- Link interception selects and centers destination screen.
- Flow preview navigation and transition metadata.
- Existing web project regression coverage.

### Verification

- Run the web typecheck and focused tests.
- Run contracts and daemon focused tests.
- Build the web package.
- Manually verify a new Web project and an existing project remain in the
  existing editor.
- Manually verify a new Mobile project can create, select, edit, navigate, and
  export at least two screens.

## 13. Delivery plan and commits

The branch uses separate commits that can be reviewed independently while
culminating in one PR:

1. `docs: specify mobile multi-screen editor` — this complete design spec;
2. `feat(contracts): add mobile project and manifest contracts`;
3. `feat(daemon): add mobile prompt and manifest persistence`;
4. `feat(web): add permanent project platform selection`;
5. `feat(web): add mobile canvas and screen management`;
6. `feat(web): add selection-aware mobile agent context`;
7. `feat(web): add flow preview and mobile exports`;
8. `test: cover mobile multi-screen editor behavior`.

Commit boundaries may be combined only when the repository's existing test or
contract dependency graph makes a smaller atomic change impossible. The first
commit must contain this spec before any implementation commit is made.

## 14. Out of scope for this milestone

- CLI support or CLI-only mobile commands.
- Native React Native, Swift, or Kotlin generation/export beyond a planned
  placeholder.
- Version history independent from project history.
- A Figma-style explicit connection-line graph on the canvas.
- Overlapping screens or unconstrained freeform collision behavior.
- Device chrome that changes authored screen layout or acts as native OS UI.
- Automatic conversion of old Web projects to Mobile.
