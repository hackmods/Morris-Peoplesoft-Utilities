# Changelog

All notable changes to Morris PeopleSoft Utilities are documented here.

## [Unreleased]

## [1.0.21] — 2026-07-22

### Fixed

- **Shortcuts / Admin / Pages menus:** portal open menus to `document.body` (escapes Fluid header overflow *and* transform clipping); restore on close
- **Page Info dialog:** wrap/group action buttons (Copy / Compare / Close) so they no longer overflow a single row

## [1.0.20] — 2026-07-22

### Changed

- **Options Features tab:** grouped toggles (Utilities bar / Page helpers / Optional·careful) with hints; clearer Preferences card for UI scope, field copy format, and quiet prompts; visual QOL refresh
- **PCode dialog:** clearer copy — these are App Designer paste starters (not live PeopleCode); lock a field with Inspect first so RECORD.FIELD is filled in

## [1.0.19] — 2026-07-22

### Fixed

- **Shortcuts / Admin flyouts:** nested Category » / SubCategory » panels were clipped by parent `overflow` and closed when the pointer crossed the gap — submenus now use fixed positioning with overlap + a short hide delay

## [1.0.18] — 2026-07-22

### Fixed

- **Field Inspector:** stop wrapping shared Fluid `.ps_box-control` / Classic multi-field parents as one mega highlight — each field gets its own orange border/icon again (Classic + Fluid)
- **Field Inspector:** Fluid menus / nav collections that host Classic pages in nested iframes — decorate from the outer content root, resolve nested Classic docs, and recover on late nested frame loads

## [1.0.17] — 2026-07-22

### Added

- **Wave 7 / UG-01 — Customization upgrade watch** (see `docs/findings/future-enhancements.md`):
  - **Page Info** — Watch customization (capture UI fingerprint with optional notes + env label) and Check upgrade drift vs saved baseline
  - **Options → Upgrade** — list watches, delete, export/import JSON
  - Compares tabs, structure hosts, and field ids — does **not** detect PeopleCode-only overrides

## [1.0.16] — 2026-07-22

### Added

- **Wave 6.1 PeopleCode / Fluid / Admin remainder** (see `docs/findings/future-enhancements.md`):
  - **Field Inspector context chips** — Prompt, Display, Deferred from DOM/ARIA (PC-04)
  - **Message / translate keys** — scan visible DOM for MsgGet / XLAT hints; copy from PCode dialog (PC-05)
  - **CREF path + theme** metadata in Page Info, object pack, and Structure dialog (FL-02, FL-03)
  - **IB breadcrumb** — compact bar chip + Page Info line on Integration Broker pages (AD-02)
  - **Process Monitor ticket pack** — copy visible instance/type/run control from Page Info (AD-03)
  - **Object pack compare** — clipboard diff for multi-env handoffs (AD-04)
  - **Trace bar hint** — preset name or active flag count on Trace button (TR-04)
  - **Trace flag guide** — plain-language help in Options → Tracing (TR-05)

## [1.0.16] — 2026-07-22

### Added

- **Wave 6.1** (see `docs/findings/future-enhancements.md`):
  - Field Inspector **Prompt / Display / Deferred** context chips (PC-04)
  - **Message / XLAT key** detect + copy from visible DOM in PCode dialog (PC-05)
  - **CREF path** and **theme/branding** clues in Page Info / Structure / object pack (FL-02/03)
  - **IB breadcrumb** chip + copy on Integration Broker pages (AD-02)
  - **Process Monitor ticket pack** copy from visible cells (AD-03)
  - **Compare object pack** clipboard diff on Page Info (AD-04)
  - Trace bar hint for active preset / flag count (TR-04)
  - Options Tracing **flag chooser guide** (TR-05)

### Fixed

- Packaging script archiver import for CI/`tsc` (`export =` interop) so tag releases can publish the Store zip
- Coverage gates: exclude `bar.ts` DOM wiring (helpers remain covered) so CI matches extracted-module thresholds

## [1.0.15] — 2026-07-22

> Note: The `v1.0.15` git tag’s GitHub Release zip failed CI packaging; features below ship in the **v1.0.16** Store zip.

### Added

- **Legacy Shortcuts / Pages parity**
  - Hierarchical **Shortcuts** flyout (Category → SubCategory → items), Shortcut Details dialog, per-item new window
  - **Pages** flyout with current-tab highlight (CSP-safe tab activation)
- **Wave 6 PeopleCode / Fluid / Admin** (see `docs/findings/future-enhancements.md`):
  - **PCode** dialog — FieldChange, FieldEdit, RowInit, SavePreChange, Component Pre/PostBuild, GetRowset stubs with per-stub and copy-all actions (PC-01)
  - **Page Info object pack** — plain + Markdown clipboard for Menu.Component.Page, portal/node/site, ToolsRel, UI mode, locked field (PC-02)
  - **GetRowset copy format** — `GetLevel0().GetRow(n).GetRecord().GetField()` when row occurrence is known (PC-03)
  - **Structure** dialog — read-only Fluid/Classic group, scroll, grid, and related host inventory (FL-01)
  - **Admin** flyout — grouped jumps to Permission Lists, Roles, User Profiles, Portal Structure, Message Catalog, IB monitors, Process Monitor, Web Profile, Query Manager (AD-01)

### Fixed

- Environment delete remaps `urlSites` indexes; Options toast/empty states/import guards; Page Info Escape

## [1.0.14] — 2026-07-21

### Fixed

- **Classic Field Inspector:** Inspect ON with zero orange icons on TargetContent pages
  - Viewport gating no longer uses Classic `<tr>` hosts (off-screen row geometry skipped every field)
  - Nested empty `.ps_target-iframe` no longer steals the Classic content document
  - MutationObserver reinject uses `nodeType` (cross-realm iframe safe)
  - Scroll/resize reinject listens on content frame windows; recovery poll always arms for Classic iframes

## [1.0.13] — 2026-07-21

### Added

- **Wave 5 P3 remainder** (see `docs/findings/future-enhancements.md`):
  - First-install **onboarding** checklist in Options (`showOnboarding`) (SP-02)
  - Favorites import **append / replace** + imported count (SP-03)
  - ToolsRel / UI-mode **tips** in Page Info and Help (SP-04)
  - Optional Chrome **Side Panel** (Favorites + Page Info) + ADR 0008; `sidePanel` + `tabs` permissions documented (SP-05)
  - High-contrast / forced-colors Field Inspector borders + reduced-motion notes (SP-06)
  - PeopleCode **copy formats**: `RECORD.FIELD`, `&Record.FIELD`, `GetField(Field.FIELD)` (SP-07)
  - Login bar mounts **above** the password form — never reads values (SP-08)
  - CSP-safe **Page Tabs** dialog from delivered tab links (SP-01)

## [1.0.12] — 2026-07-21

### Added

- **Wave 4 remaining P2 UX** (see `docs/findings/future-enhancements.md`):
  - Favorites **Notes** field (Options + CSV/JSON; export warn) (UX-04)
  - Page Info **Compare clipboard** diff (UX-07)
  - Nav collection / nested iframe Field Inspector bind (UX-08)
  - Options **Classic / Fluid / Both** scope for Inspect + search helpers (UX-09)
  - Add Favorite optional **Page Info description template** + notes prompt (UX-10)

## [1.0.11] — 2026-07-21

### Added

- **Wave 3 remaining P1 + key P2** (see `docs/findings/future-enhancements.md`):
  - Field Inspector: viewport-scoped decoration + scroll/resize reinject (FI-05); HTML type / maxlength / disabled chips (UX-05)
  - **Recent** components dropdown (local, capped) (PI-04)
  - Favorites / Recent **New win** checkbox using `_newwin` site rules (FV-03)
  - Page Info **Page token: present|not detected** boolean only — never shows ICSID value (TR-03)
  - Stronger environment color strip via CSS custom property (UX-03)

## [1.0.10] — 2026-07-21

### Added

- **Wave 2 Fluid / search / Dev tools** (see `docs/findings/future-enhancements.md`):
  - Field Inspector: Fluid `ps_box-*` selectors + wrap Fluid edit hosts without swallowing large groups
  - Search helpers: broader Classic iframe + Fluid detection; Advanced Search MORE/expand-all; Correct History selector fallbacks; late reinject retries
  - Trace Options **presets** (Off / Default / SQL / PeopleCode / Verbose) + active flag summary
  - In-bar **Go to** component URL builder (Menu.Component.Market) · **Alt+Shift+G**

## [1.0.9] — 2026-07-21

### Added

- **Wave 1 BA/Dev enhancements** (see `docs/findings/future-enhancements.md`):
  - Field Inspector: copy `RECORD.FIELD` on lock + Copy field control; nearby **Label**; **Work** badge for `DERIVED_`/`WRK_`
  - Page Info: DB name/type, AppsRel, UI mode, portal/node/site; **Copy Markdown** for tickets
  - Toolbar **Classic/Fluid/Nav** mode badge
  - Favorites **Category** optgroups + bar **filter**
  - Favorites CSV export **business-key warning**
  - Shortcuts: **Alt+Shift+P** Page Info, **Alt+Shift+I** Inspect, **Alt+Shift+C** copy field
  - Clearer Trace 🔒 help when UTILITIES security blocks access

## [1.0.8] — 2026-07-21

### Changed

- **Field Inspector readout:** show separate **Rec** / **Fld** / **Row** labels (inferred from other fields on the page) instead of one opaque `RECORD_FIELD` string; hide the yellow panel when empty

## [1.0.7] — 2026-07-21

### Fixed

- **Page Info:** capture Tools Release (`ToolsRel`) from multiline / document-level HTML comments and merge portal + Classic `TargetContent` meta (no longer requires `User`+`ToolsRel`+`AppServ` in one rigid regex)
- **Field Inspector (Classic):** icons never appeared in `#ptifrmtgtframe` because `instanceof HTMLElement` is false across iframe realms — use nodeType checks instead; real inline SVG icons (CSP-safe); prefer iframe element over unreliable `window.TargetContent`; reinject on load / MutationObserver / short poll for Classic AJAX

## [1.0.6] — 2026-07-21

### Fixed

- **Field Inspector:** icons use inline SVG (PeopleSoft CSP can block `chrome-extension://` images); resolve Classic `TargetContent` / wait for iframe; do not remount/resizeAll on Inspect toggle (that wiped icons); reinject after bar refresh
- **Tracing:** default feature flag is off for new installs (`traceOption: No`)

## [1.0.5] — 2026-07-21

### Fixed

- Classic tools audit remediation:
  - **Trace:** use delivered `psc/{site}_newwin` UTILITIES components with ICSID/`#ICSave` checkbox POSTs (was a fabricated mask POST that falsely reported success)
  - **Favorites clear-BCS:** restore `isMenuCrefNav` / `setStoredData` contract
  - **Bar mount:** prefer `#ptifrmtarget` above Classic content and call `ptIframe.resizeAll`
  - **User ID / search:** refresh when `#ptifrmtgtframe` loads; search injects require `PSSRCHPAGE`
  - **Correct History:** prefer `getElementsByName("PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C")`
  - **New Window:** resolve Menu.Component from target iframe; show only on components
  - **Login bar:** greeting (+ help) only
  - **Favorites URL:** keep window-specific site (`ps_2`) when navigating

### Added

- Classic tools audit write-up (`docs/findings/classic-tools-audit.md`)

## [1.0.4] — 2026-07-21

### Fixed

- Field Inspector parity with classic PS Utilities: inject orange magnifying icons beside PeopleSoft fields, show the record/field name on the bar on hover, and lock green on click (replaces hover-only tip that did not fully render on Classic pages).

## [1.0.3] — 2026-07-21

### Fixed

- Content script runtime error: Vite was emitting `content.js` as ESM with shared-chunk imports. Chrome loads content scripts as classic scripts, so the build now rebundles `content.js` as a self-contained IIFE.

## [1.0.2] — 2026-07-21

### Fixed

- Chrome load failure: `web_accessible_resources` match patterns must be origin-only (`*://*/*`). Path-scoped patterns like `*://*/psp/*` are rejected by Chrome with “Invalid match pattern.”

## [1.0.1] — 2026-07-21

### Added

- Release readiness doc with blocking vs nice-to-have Store submit items (`docs/release-readiness.md`)
- Expanded Store submission checklist aligned to pre-submit blockers
- Expanded automated test suites with coverage gates

### Changed

- Dependency upgrades (Vite 8, ESLint 10, Node types) for current CI toolchain
- Store listing mockup assets for dashboard preview

## [1.0.0] — 2026-07-21

### Added

- Greenfield Manifest V3 TypeScript extension (no jQuery)
- Feature parity targets: bar, user ID, environments, favorites, tracing, page info, field inspector, new window, Correct History, Advanced Search
- Opt-in host allowlist (default off)
- AODA-oriented UI (WCAG 2.1 AA intent) with axe CI
- Privacy policy, Store asset pack, wiki guides, GitHub Actions CI/release
- Migration from legacy PS Utilities storage keys when present

### Credits

- Maintained by hackmods (Ryan Morris)
- Inspired by PS Utilities (Uffe Graakjaer, Neil Yetman, and contributors)
