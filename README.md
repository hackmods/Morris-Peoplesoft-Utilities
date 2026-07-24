# Morris PeopleSoft Utilities

[![CI](https://github.com/hackmods/Morris-Peoplesoft-Utilities/actions/workflows/ci.yml/badge.svg)](https://github.com/hackmods/Morris-Peoplesoft-Utilities/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-coming%20soon-lightgrey)](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/store/SUBMISSION_CHECKLIST.md)

**Morris PeopleSoft Utilities (MPU)** is a modern Manifest V3 Chrome extension that helps college business analysts and technical staff work faster in PeopleSoft **Classic** and **Fluid**—with privacy-first defaults and AODA-oriented accessibility.

Maintained by **[hackmods](https://github.com/hackmods)** (Ryan Morris).

## Why MPU?

Classic PS Utilities improved PeopleSoft usability but aged out of Chrome Web Store and Fluid expectations. MPU is a greenfield TypeScript rewrite aimed at an **official Chrome Web Store** listing: equal feature access for BA and technical users, no credential storage, no telemetry, and documented compliance controls (including an opt-in host allowlist).

## Features

| Business analysts | Technical staff |
|---|---|
| Environment labels | PeopleCode / SQL trace toggle |
| Favorites with CSV import/export | Field Inspector (Classic, Fluid, Classic-in-Fluid) |
| Page information + upgrade watch | New window / deep links / Admin jumps |
| Field Entry (bulk paste / multi-row grids) | Trace profiles + PCode stubs |
| Advanced Search & Correct History helpers | Settings JSON backup |
| Quiet mode for env prompts | |

## Install

### Chrome Web Store (recommended)

Store listing is in progress. See:

- [`docs/release-readiness.md`](docs/release-readiness.md) — blocking vs nice-to-have before submit
- [`store/SUBMISSION_CHECKLIST.md`](store/SUBMISSION_CHECKLIST.md) — dashboard upload checklist

When published, this section will link the Store URL.

### Load unpacked (developers)

```bash
npm ci
npm run generate:icons
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder

Or download the latest zip from [GitHub Releases](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases).

## Privacy

- Settings stay in `chrome.storage.local` on your device
- **No passwords**, **no analytics**, **no developer phone-home**
- Full policy: [`docs/privacy.md`](docs/privacy.md)

## Accessibility (AODA)

MPU targets **WCAG 2.1 Level AA** for extension UI and the injected utilities bar. Details: [`docs/aoda.md`](docs/aoda.md).

## Screenshots

Preview assets live under [`store/assets/screenshots/`](store/assets/screenshots/). Replace with live PeopleSoft captures before Store submission.

## Testing

Automated gates run locally and in CI:

| Command | What it covers |
|---|---|
| `npm test` | Unit, integration, smoke, and a11y Vitest suites |
| `npm run test:coverage` | Same + V8 coverage (thresholds enforced) |
| `npm run test:a11y` | axe WCAG 2A/2AA on popup/options markup |
| `npm run audit` | a11y + Store lint + compliance scan |
| `npm run test:all` | lint + coverage + audits + production build |
| `npm run release:check` | Full release gate (lint, coverage, audits, zip) |

Suites:

- `tests/unit` — URL/adapters, storage, bar, field inspector, trace, search, injects
- `tests/integration` — BA session bootstrap + audit script execution
- `tests/a11y` — axe accessibility
- `tests/smoke` — repo/Store prerequisites and built `dist/` checks

Details: [`docs/testing/automated.md`](docs/testing/automated.md)  
Manual PeopleSoft parity: [`docs/testing/manual-parity-checklist.md`](docs/testing/manual-parity-checklist.md)

## Development

```bash
npm ci
npm run generate:icons
npm run generate:store-assets
npm run lint
npm run test:coverage
npm run audit
npm run build
npm run package          # zip for CWS / GitHub Release
npm run release:check    # full gate
```

See the [wiki sources](wiki/Home.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## PeopleSoft agent prompt pack

Separate from the extension itself: [`agents/`](agents/README.md) is a set of portable, generic AI-agent/skill prompts for PeopleSoft 8.56 (PeopleTools 8.5x–8.6x) development work — code review (effective dates, joins, keys, data sources), security/role review, an MCP-ready schema assistant, design help, onboarding, and a guide for training your own component-specific agent. Usable in Cursor, VS Code + Copilot, Claude, or any chat tool; nothing in it ships in the extension bundle.

## Releases

Tagged versions (`v*`) publish a Chrome Web Store zip via GitHub Actions. Prefer installing from the Store once live; use Release artifacts for review builds.

Latest: [v1.0.24](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/tag/v1.0.24)

## Credits

- **Maintainer / publisher:** [hackmods](https://github.com/hackmods) (Ryan Morris)
- **Inspired by:** PS Utilities — original work by **Uffe Graakjaer**, **Neil Yetman**, and contributors. MPU is a separate greenfield project; legacy sources under `.reference/` are a local behavior oracle and are not shipped in the extension package.

## License

[MIT](LICENSE)
