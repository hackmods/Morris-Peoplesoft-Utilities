# Contributing

Thanks for interest in Morris PeopleSoft Utilities. Maintained by [hackmods](https://github.com/hackmods).

## Setup

```bash
npm ci
npm run generate:icons
npm run lint
npm run test:unit
npm run build
```

## Guidelines

- Read ADRs in `docs/adr/` and Cursor rules in `.cursor/rules/`
- Maintain **Chrome and Firefox parity** in every feature/fix: shared code and version, both manifests/packages, and both browser suites. See [browser support and release policy](docs/browser-support.md).
- Do not add credential storage or telemetry
- Keep WAR matches Chrome-valid (origin-only `/*` path); scope PeopleSoft URLs via content scripts; MV3 only
- Include tests for URL/adapter/storage changes
- Run `npm run release:check` before release-related PRs
- Run `npm run test:e2e` separately before releases; it exercises both installed browser extensions.

## Pull requests

Use the PR template checklist. Mention Store/privacy impact if permissions or data handling change.

## Discussions

GitHub Discussions may be used for Q&A; prefer Issues for defects and a11y bugs.
