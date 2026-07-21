# Automated testing

## Layers

1. **Unit** (`tests/unit`) — adapters, storage, bar, field inspector, trace, search, inject sources
2. **Integration** (`tests/integration`) — BA session bootstrap + audit CLI scripts
3. **Accessibility** (`tests/a11y`) — axe-core WCAG 2A/2AA on popup/options
4. **Smoke** (`tests/smoke`) — Store/repo prerequisites; optional `dist/` checks after build

## Commands

```bash
npm test
npm run test:coverage
npm run test:all
npm run release:check
```

Coverage thresholds (adapters/features/storage) are in `vitest.config.ts`. HTML report: `coverage/`.

Chrome APIs are mocked in `tests/setup/chrome-mock.ts`.
