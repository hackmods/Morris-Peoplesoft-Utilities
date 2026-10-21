# Chrome and Firefox support

MPU maintains **Chrome 116+ and Firefox desktop 140+ (including ESR 140)** from one source tree, one settings schema, and one `package.json` version. New features, fixes, migrations, access checks, and accessibility work must be implemented and tested for **both browsers in the same change**. Browser-specific behavior belongs in `src/platform/browser.ts`; manifest differences belong in `scripts/extension-manifest.ts`.

## Build and package

Use Node 22 or newer and `npm ci` with the checked-in lockfile.

| Command | Result |
|---|---|
| `npm run build` | Builds both browsers and audits manifest/runtime parity |
| `npm run build:chrome` | Chrome unpacked extension in `dist/` |
| `npm run build:firefox` | Firefox temporary extension in `dist/firefox/` |
| `npm run dev` / `npm run dev:firefox` | Watch the selected browser build |
| `npm run package` | Fresh builds, Chrome store audit, Firefox validator, and two browser ZIPs |
| `npm run release:check` | Lint, both packages, coverage, accessibility/compliance, and separate agent toolkit ZIP |
| `npm run test:e2e` | Fresh dual build, Chromium extension suite, then Firefox extension suite |
| `npm run test:e2e:chrome` / `npm run test:e2e:firefox` | Build and test the selected browser |

Chrome builds clear `dist/`, including a previous nested Firefox build. Run `npm run build` before auditing parity or packaging. Chrome packages explicitly exclude `firefox/`. Browser ZIP names are `morris-peoplesoft-utilities-chrome-v<VERSION>.zip` and `morris-peoplesoft-utilities-firefox-v<VERSION>.zip`.

`npm run audit:browsers` requires both outputs, compares each manifest with the shared definition/version, checks required entry points, and compares the shared runtime asset inventory and bytes. Source maps can differ because output paths differ. Features must not be conditional on browser build modes.

## Local installation

Chrome: open `chrome://extensions`, enable Developer mode, and load `dist/` unpacked.

Firefox: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `dist/firefox/manifest.json`. Temporary installation ends when Firefox closes. Alternatively, run `npx web-ext run --source-dir dist/firefox` to use a disposable development profile.

Firefox desktop is the supported target; Android has not been validated. Settings remain local to each browser profile and do not sync between Chrome and Firefox. Options JSON export/import transfers supported settings; separately stored workspaces/preferences retain their existing export behavior.

## Platform differences

| Surface | Chrome | Firefox |
|---|---|---|
| Manifest | MV3, minimum Chrome 116 | MV3, minimum Firefox 140, stable Gecko add-on ID |
| Background | Module service worker | Module background event page |
| Sidebar | `sidePanel`, per-tab configuration | `sidebarAction`, tab-specific panel in the active window |
| API namespace | `chrome` (Chrome 116 compatibility) | Native promise-based `browser` |
| Agent entry point | Open shared sidebar; guarded Options fallback on failure | Same; Firefox may reject opening after content-script messaging loses user activation |

Sidebar calls start directly in the user's click handler without awaiting configuration first. A failed toolbar Agents open falls back to Options only after revalidating the originating tab and current access. Sidebar navigation and page snapshots still enforce PeopleSoft host/environment/feature restrictions.

## Validation and parity policy

- Shared unit/integration suites and coverage gates apply to both browsers.
- Chromium tests use Playwright's unpacked-extension context. Firefox tests use Selenium/geckodriver to install the actual Firefox build; Playwright provides the test runner and reporting only.
- Install Firefox locally. Selenium Manager locates/downloads geckodriver on first use; set `FIREFOX_BINARY` and/or `GECKODRIVER` for managed or offline installations. `FIREFOX_DRIVER_LOG=1` enables driver diagnostics. Tests use headless Firefox, disposable profiles, and local synthetic fixtures. The driver uses `--allow-system-access` solely to navigate extension test pages through Firefox's UI process; the shipped extension receives no additional permissions or privileges.
- CI builds/audits both targets, runs Chromium, and tests Firefox at the declared 140 floor and current stable version. Tag releases run both browser suites separately from `release:check`, before uploading either package.
- Run rendered axe checks, including contrast, when dynamic UI changes. Automated checks do not establish AODA/WCAG conformance.
- Real PeopleTools 8.62 sign-off is required independently for each browser across Classic/Classic Plus, Fluid, Classic-in-Fluid, collections, same-origin modal frames, Field Entry, trace, clipboard, and keyboard/assistive-technology workflows. Record evidence in `docs/testing/peopletools-8.62.md`; fixtures are not Oracle patch-level evidence.

Do not silently drop a feature, change storage formats, widen permissions, or relax security/coverage checks for one browser. Document unavoidable platform differences here and test their guarded fallback behavior.

### Initial local evidence — 2026-10-21

Version 1.0.33 passed `npm run release:check` (368 tests; 87.16% line coverage with unchanged gates), the 41-test Chromium extension suite, and the 8-test Firefox extension suite on Windows with Firefox 155.0.1. Both ZIPs were inspected for root manifests, shared version, licensing, and absence of nested browser output. The Firefox 140/current-stable CI matrix is configured; it was not executed locally. No new real-system PeopleTools verification or store submission was performed.

## Firefox distribution and review

The package command produces an **unsigned upload/review ZIP**, not an installable signed XPI. Mozilla signing and store publication are explicit separate tasks; this workflow does not upload or publish anything.

1. Keep `browser_specific_settings.gecko.id` stable (`morris-peoplesoft-utilities@hackmods`) for updates. Change it only before first publication and deliberately update tests/documentation.
2. Run `npm run release:check` and `npm run test:e2e`; retain both reports and real-system verification status.
3. Submit the Firefox ZIP to Mozilla Add-ons (listed) or Mozilla's signing flow (unlisted/self-distributed). Normal release/beta Firefox installations require Mozilla signing.
4. Supply the matching source/tag, `package-lock.json`, and reproducible build instructions (`npm ci`, `npm run build:firefox`, output `dist/firefox/`) when Mozilla requests source for the bundled/minified code. Do not substitute the separate agent prompt toolkit for extension source.
5. Reuse accurate privacy disclosures and reviewed artwork only where they meet Mozilla's listing requirements. Keep browser-specific screenshots and provenance explicit; never label synthetic captures as real PeopleTools verification.
6. The Firefox manifest declares `data_collection_permissions.required: ["none"]` for MPU's local-only design and no developer telemetry. Reassess the declaration and privacy policy before adding any transmission. User-requested same-origin PeopleSoft actions still operate against the user's PeopleSoft session.

`web-ext lint` errors fail the package gate. Its heuristic warnings about existing escaped UI templates/DOM serialization require source review during submission; a clean build or zero validation errors is not Mozilla approval. Android compatibility warnings do not establish Android support.

The initial validator run reports 11 warnings: one Android minimum-version warning and five dynamic-template locations repeated in the content bundle and shared UI chunk. Source-map review identifies `favorites-ui.ts` (escaped datalist option attributes), `field-entry-ui.ts` (escaped eligibility rows/title and saved-profile options), and `bar.ts` (fixed Help/Pages markup with labels populated through `textContent`). These warnings are retained for Mozilla review rather than suppressed; no broader CSP or additional page privileges are used to silence validation.

References: [background contexts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background), [Firefox sidebar](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction), [Mozilla signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), [data declarations](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/).
