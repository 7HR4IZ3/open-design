---
name: mobile-multi-screen-editor
description: |
  Design and implement generic mobile products as multiple self-contained
  HTML/CSS/JS screens with a durable OpenDesign manifest, screen CRUD,
  navigation, and selection-aware editing. Use for mobile app prototypes,
  multi-screen flows, mobile canvas editing, screen management, or requests to
  create, update, rename, reorder, duplicate, or delete mobile screens.
triggers:
  - "mobile multi-screen editor"
  - "multi-screen mobile app"
  - "mobile app flow"
  - "mobile prototype"
  - "edit mobile screen"
  - "manage mobile screens"
  - "mobile canvas"
od:
  mode: prototype
  platform: mobile
  category: web-artifacts
  scenario: app-prototype
  design_system:
    requires: true
  craft:
    requires: [typography, color, anti-ai-slop, accessibility-baseline, state-coverage, animation-discipline]
---

# Mobile Multi-Screen Editor

Use this skill for project-aware mobile UI work. Treat a mobile product as a
collection of independently addressable screens, not as a desktop page placed
inside a phone frame. Apply the active `DESIGN.md` first and follow the
frontend-design discipline: understand the brief, choose one visual direction,
build real interaction states, and self-review the result.

## Workflow

1. **Plan the product and flow.** Identify the audience, primary job, main
   path, and screen list before choosing the look. Create multiple screens when
   the brief describes an app or flow; honor an explicit one-screen request.
   Treat “mobile” as generic mobile UI unless the user names iOS or Android.

2. **Commit to a visual direction.** Resolve typography, color, spacing,
   hierarchy, component shape, and motion from the product context and active
   design system. Avoid interchangeable SaaS layouts, purple-blue gradients,
   decorative glass, oversized radii, and device chrome that looks like product
   UI.

3. **Deliver screen files first.** Make every user-facing screen a separately
   addressable, self-contained HTML/CSS/JS file, using semantic paths such as
   `screens/home.html`, `screens/search.html`, and `screens/profile.html`.
   Project-relative `assets/` and `shared/` files may hold reusable images,
   tokens, CSS, or support code, but each screen must remain independently
   previewable. Keep `index.html` as an optional launcher/overview, never the
   only representation of a multi-screen product.

4. **Maintain the mobile manifest.** Treat `.od/mobile-manifest.json` as the
   project-owned source of truth; never render it as authored product UI. Keep
   schema `open-design.mobile-manifest.v1`, at least one and at most 100
   screens, and update it with every screen mutation. Each record must preserve:
   `id`, `file`, `name`, `order`, `x`, `y`, `width`, `height`, `orientation`
   (`portrait` or `landscape`), `deviceFrame`, `createdAt`, and `updatedAt`;
   optionally include `routeKey` and `transition` (`none`, `fade`,
   `slide-left`, `slide-right`, or `modal`). Persist project editor `x`, `y`,
   `zoom`, `updatedAt`, and the selected screen id when present.

   Generate a UUID-like stable id once and preserve it across rename, reorder,
   duplication, and content edits. Keep screen paths project-relative and safe;
   do not put screens under `.od/` or other internal directories. On refresh,
   remove manifest records whose files were deleted or renamed externally when
   they cannot be reconciled, and keep the remaining valid screens usable.

5. **Build for a phone.** Start portrait-first while honoring stored landscape
   dimensions. Respect `env(safe-area-inset-*)` and device cutouts; reserve
   space for status, keyboard, sticky headers, bottom actions, and the home
   indicator. Keep readable line lengths, resilient text wrapping, stable
   scroll ownership, and no horizontal scrolling. Provide default, loading,
   empty, error, disabled, and success states where the flow needs them.

   Use semantic controls, accessible names and order, strong contrast, visible
   focus, reduced-motion behavior, and screen-reader-friendly feedback. Make
   touch targets at least 44×44px with at least 8px between adjacent targets;
   never make hover the only way to discover or operate a control. Use suitable
   input types, preserve focus through keyboard and viewport-resize changes,
   keep back behavior predictable, and keep transitions performant. A selected
   device frame is decorative editor chrome only: do not inject it into screen
   HTML or present it as native operating-system UI.

6. **Apply selection-aware editing.** Read the current manifest and files before
   editing. A selected screen appears in context as a selection chip containing
   its name, stable id, and file, with a clear/remove action; it is not a binary
   file or image attachment. With one selection, use that screen as the default
   edit target. With no selection, apply the request at project level. Treat
   selection as a hint, not a restriction: an explicit request may edit, create,
   rename, duplicate, reorder, or remove other screens, and multi-screen
   prompts should receive the compact manifest inventory.

7. **Use the screen CRUD contract.** Keep file and manifest changes together
   whenever possible, preserving ids and resolving positions away from
   collisions.

   - **Create:** write a self-contained HTML screen, generate an id, choose the
     first available grid slot, and add its manifest record.
   - **Rename:** rename the HTML file and update `name`/`file`; preserve `id`.
   - **Duplicate:** copy the screen and valid supporting references, generate a
     new id, and place it without overlap.
   - **Reorder:** update only `order` values.
   - **Move:** update `x`/`y` and resolve any collision.
   - **Edit:** save the HTML/version and update `updatedAt`.
   - **Delete:** require explicit confirmation that names the screen and says
     its HTML file and canvas entry will be removed. Refuse deletion if it
     would leave zero screens; after confirmation remove the file and record.
   - **Repair:** reconcile missing or malformed entries from valid HTML files
     without blocking the project from opening.

8. **Connect navigation.** Store route identity in `routeKey` and transition
   metadata when useful. Make links and buttons resolve predictably by
   `data-screen-id`, `routeKey`, project-relative `href`, or manifest file
   path. In the editor or flow preview, selecting a link selects and centers
   the destination screen; preserve normal behavior for unresolved or external
   links. Keep navigation and transitions in metadata/preview behavior, not in
   canvas labels or authoring controls inside the product UI.

9. **Return mutation metadata.** After every mobile generation or screen
   mutation, return a machine-readable summary (or let the UI derive the same
   shape from the refreshed manifest):

   ```ts
   interface MobileScreenMutationMetadata {
     projectId: string;
     screens: Array<{
       id: string;
       file: string;
       name: string;
       action: 'created' | 'updated' | 'renamed' | 'duplicated' |
         'reordered' | 'deleted';
     }>;
     selectedScreenId?: string | null;
     manifestUpdated: boolean;
   }
   ```

10. **Self-review before delivery.** Verify that every user-facing screen is
    separately addressable, the manifest has valid unique ids/files and
    non-overlapping positions, navigation metadata points to real screens,
    delete cannot remove the last screen, and shared references are
    project-relative. Check portrait and landscape behavior, safe areas,
    keyboard/focus handling, touch targets, contrast, reduced motion, and all
    declared interaction states. Do not expose editor metadata, canvas
    controls, device selectors, or screen-management UI in authored screens.
