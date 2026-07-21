# Agent guide — Morris PeopleSoft Utilities

This repository is a **Chrome Manifest V3 extension** for PeopleSoft productivity.

## Read first

- Plan intent: official Chrome Web Store listing, BA + tech parity, AODA, no credentials/telemetry
- **Future enhancements (BA + developers):** `docs/findings/future-enhancements.md` · Cursor plan: `.cursor/plans/future-enhancements.md`
- ADRs: `docs/adr/`
- Findings: `docs/findings/legacy-ps-utilities-audit.md`, `docs/findings/classic-tools-audit.md`
- Cursor rules: `.cursor/rules/` (includes `product-roadmap.mdc`)
- Legacy oracle (local only, gitignored): `.reference/PS-Utilities`

## Commands

```bash
npm run lint
npm run test:unit
npm run audit
npm run build
npm run package
npm run release:check
```

## Do not

- Edit plan files under `.cursor/plans` unless asked (roadmap plan is maintained when enhancing the backlog)
- Commit `.reference/` or private keys
- Add analytics or password features
