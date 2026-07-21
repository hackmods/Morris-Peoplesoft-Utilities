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
- Do not add credential storage or telemetry
- Keep WAR matches Chrome-valid (origin-only `/*` path); scope PeopleSoft URLs via content scripts; MV3 only
- Include tests for URL/adapter/storage changes
- Run `npm run release:check` before release-related PRs

## Pull requests

Use the PR template checklist. Mention Store/privacy impact if permissions or data handling change.

## Discussions

GitHub Discussions may be used for Q&A; prefer Issues for defects and a11y bugs.
