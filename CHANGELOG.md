# Changelog

All notable changes to Morris PeopleSoft Utilities are documented here.

## [Unreleased]

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
