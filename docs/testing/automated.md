# Automated testing

## Layers

1. **Unit** (`tests/unit`) — adapters, storage, bar, field inspector, trace, search, inject sources
2. **Integration** (`tests/integration`) — BA session bootstrap + audit CLI scripts
3. **Accessibility** (`tests/a11y`) — axe-core WCAG 2A/2AA on popup/options
4. **Smoke** (`tests/smoke`) — Store/repo prerequisites; optional `dist/` checks after build
5. **Browsers** — actual installed Chromium extension (`tests/e2e`) and Firefox extension (`tests/firefox`), including rendered axe checks with contrast

## Commands

```bash
npm test
npm run test:coverage
npm run test:all
npm run release:check
npm run test:e2e
```

Coverage thresholds (adapters/features/storage) are in `vitest.config.ts`. HTML report: `coverage/`.

Extension APIs are mocked in `tests/setup/chrome-mock.ts`; platform tests also exercise the native Firefox namespace and sidebar mapping. `npm run build` builds/audits both manifests and compares shared runtime assets. See [browser support and parity policy](../browser-support.md). Browser suites run separately from `release:check` and both gate tagged release uploads.

## Coverage exclusions

Vitest intentionally excludes browser-entry surfaces that need a real browser extension context:

- `src/inject/**`
- `src/background/**`
- `src/content/index.ts`
- `src/features/bar.ts` (DOM toolbar wiring; pure helpers live under `src/features/*` and stay covered)
- `src/ui/popup/popup.ts`
- `src/ui/options/options.ts`
- `src/ui/sidepanel/sidepanel.ts`

Prefer extracting pure helpers (CSV/env remap, adapters, feature modules) into `src/storage` / `src/features` so they stay unit-tested.
