# Agent guide — Morris PeopleSoft Utilities

This repository is a **Chrome Manifest V3 extension** for PeopleSoft productivity.

## Read first

- Plan intent: official Chrome Web Store listing, BA + tech parity, AODA, no credentials/telemetry
- ADRs: `docs/adr/`
- Findings: `docs/findings/legacy-ps-utilities-audit.md`
- Cursor rules: `.cursor/rules/`
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

- Edit the plan file under `.cursor/plans` unless asked
- Commit `.reference/` or private keys
- Add analytics or password features
