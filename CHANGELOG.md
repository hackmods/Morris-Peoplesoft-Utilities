# Changelog

All notable changes to Morris PeopleSoft Utilities are documented here.

## [Unreleased]

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
