# Changelog

All notable changes to Morris PeopleSoft Utilities are documented here.

## [Unreleased]

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
