# Classic PeopleSoft tools audit (MPU 1.0.4 → 1.0.5)

**Date:** 2026-07-21  
**Scope:** Customer pages are primarily **Classic** (portal chrome + `#ptifrmtgtframe` content iframe).  
**Oracle:** PS Utilities 4.2.1 CRX (local extract; not shipped).

## Executive summary

| Area | 1.0.4 status | Action in 1.0.5 |
|---|---|---|
| Field Inspector | OK (icon inject + iframe reload) | Keep |
| Host allowlist / env registration / migration | OK | Keep |
| **Trace** | **BROKEN** — fabricated POST, wrong servlet | Reimplement legacy GET/POST protocol |
| **Favorites clear-BCS** | **BROKEN** — wrong page API | Restore `isMenuCrefNav` |
| Bar mount on Classic | PARTIAL — Fluid/body fallback | Prefer `#ptifrmtarget` + resize |
| User ID / Page Info / search | PARTIAL — iframe load race | Refresh on `#ptifrmtgtframe` load |
| Adv Search / Correct History | PARTIAL — no `PSSRCHPAGE`, weak frame access | Match legacy injects |
| New Window / login bar / fav site | PARTIAL | Gate + iframe path + window site |

## Per-feature status (pre-1.0.5)

| Feature | Status | Severity |
|---|---|---|
| Utilities bar mount | PARTIAL | P1 |
| Environment label | OK | — |
| User ID | PARTIAL | P1 |
| Favorites + clear BCS | PARTIAL | P0 |
| Trace | BROKEN | P0 |
| Page Info | PARTIAL | P1 |
| Field Inspector | OK | — |
| New Window | PARTIAL | P1 |
| Advanced Search | PARTIAL | P1 |
| Correct History | PARTIAL | P1 |
| Login/logout bar | PARTIAL | P1 |
| Host allowlist | OK | — |
| Quiet env prompt | OK | — |
| Settings migration | OK | — |

## Cross-cutting Classic model

- Content script on **portal top** document (no `all_frames`) is correct.
- Drive iframe via `getTargetDocument()` / `#ptifrmtgtframe`.
- WAR `icons/*` + inject scripts with origin-only matches (`*://*/*`) is Chrome-required.
- `content.js` must remain a classic IIFE (fixed in 1.0.3).

## Fixes shipped in 1.0.5

See CHANGELOG. Remaining later (P2): richer env UI, favorites categories, debounce search reinject on storage churn.
