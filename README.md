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
| Favorites with CSV import/export | Field inspector (keyboard + Esc) |
| Page information (copy path) | New window / deep links |
| Advanced Search & Correct History helpers | Trace profiles in Options |
| Quiet mode for env prompts | Settings JSON backup |

## Install

### Chrome Web Store (recommended)

Store listing is in progress. See [`store/SUBMISSION_CHECKLIST.md`](store/SUBMISSION_CHECKLIST.md). When published, this section will link the Store URL.

### Load unpacked (developers)

```bash
npm ci
npm run generate:icons
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder

## Privacy

- Settings stay in `chrome.storage.local` on your device
- **No passwords**, **no analytics**, **no developer phone-home**
- Full policy: [`docs/privacy.md`](docs/privacy.md)

## Accessibility (AODA)

MPU targets **WCAG 2.1 Level AA** for extension UI and the injected utilities bar. Details: [`docs/aoda.md`](docs/aoda.md).

## Screenshots

Preview assets live under [`store/assets/screenshots/`](store/assets/screenshots/). Replace with live PeopleSoft captures before Store submission.

## Development

```bash
npm ci
npm run generate:icons
npm run generate:store-assets
npm run lint
npm run test:unit
npm run audit
npm run build
npm run package          # zip for CWS / GitHub Release
npm run release:check    # full gate
```

See the [wiki sources](wiki/Home.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Releases

Tagged versions (`v*`) publish a Chrome Web Store zip via GitHub Actions. Prefer installing from the Store once live; use Release artifacts for review builds.

## Credits

- **Maintainer / publisher:** [hackmods](https://github.com/hackmods) (Ryan Morris)
- **Inspired by:** [PS Utilities](https://github.com/) — original work by **Uffe Graakjaer**, **Neil Yetman**, and contributors. MPU is a separate greenfield project; legacy sources under `.reference/` are a local behavior oracle and are not shipped in the extension package.

## License

[MIT](LICENSE)
