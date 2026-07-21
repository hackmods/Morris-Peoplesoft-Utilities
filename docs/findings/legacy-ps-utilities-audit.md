# Legacy PS Utilities audit findings

**Source:** `.reference/PS-Utilities` v4.2.1 (local oracle, not shipped)  
**Date:** 2026-07-21

## Architecture

- Manifest V3 with `storage` only; content scripts on `psp`/`psc` patterns
- jQuery 1.9.1 + jQuery UI 1.10.3 and assorted plugins
- Page-context inject scripts for Advanced Search, Correct History, breadcrumb clear, frame resize
- Service worker initializes defaults and syncs trace across tabs

## Active features retained as parity targets

User ID, Environment indicator, Favorites, Tracing, Page Info, Field Inspector, New Window, Correct History, Advanced Search, Login bar, Environments manager

## Removed / not carried forward

- Quick Logins / credential storage (removed upstream; must never return)
- Web Directives
- Google Analytics
- Page Tabs (broken under MV3 CSP)

## Risks addressed by MPU rewrite

| Risk | MPU response |
|---|---|
| Ancient jQuery CVEs / tech debt | TypeScript, no jQuery |
| `web_accessible_resources` matches `*://*/*` | Restrict to `psp`/`psc` |
| Classic-first search injects | Classic + Fluid adapters |
| No a11y model | AODA / WCAG 2.1 AA + axe CI |
| Store policy friction | Privacy docs, minimal permissions, audits |
| Dead code / dual CSS trees | Clean module layout |

## Storage model (legacy)

`chrome.storage.local` with Yes/No string flags, `shortcutstable`, `psutilEnvs`, `psutilUrlSites`, `psutilTraceSettings`. MPU migrates these once into `mpuSettings`.
