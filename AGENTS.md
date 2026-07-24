# Agent guide — Morris PeopleSoft Utilities

This repository is a **Chrome Manifest V3 extension** for PeopleSoft productivity.

## Read first

- Plan intent: official Chrome Web Store listing, BA + tech parity, AODA, no credentials/telemetry
- **Future enhancements (BA + developers):** `docs/findings/future-enhancements.md` · Cursor plan: `.cursor/plans/future-enhancements.md`
- ADRs: `docs/adr/`
- Findings: `docs/findings/legacy-ps-utilities-audit.md`, `docs/findings/classic-tools-audit.md`
- Cursor rules: `.cursor/rules/` (includes `product-roadmap.mdc`)
- Legacy oracle (local only, gitignored): `.reference/PS-Utilities`
- **PeopleSoft agent prompt pack (separate side toolkit, not shipped in the extension):** `agents/README.md` — generic Cursor/VS Copilot/Claude prompts (`review-*`, `assist-*` including SQL + IB/CI, `design-*`, `guide-*`). Keep it generic — no site-specific customizations/role names checked in here.

## Commands

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run audit
npm run build
npm run package
npm run release:check
```

E2E loads the unpacked extension from `dist/` (see `tests/e2e/README.md`). Not part of `release:check`.

## Do not

- Edit plan files under `.cursor/plans` unless asked (roadmap plan is maintained when enhancing the backlog)
- Commit `.reference/` or private keys
- Add analytics or password features
