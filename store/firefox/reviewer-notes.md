# Firefox review notes — 1.0.33

## Source and build

The initial Firefox implementation is commit `137a303eb493a4f54694fdd9424af7b0ffbc4e4b` on `feat/chrome-firefox-parity`. The source ZIP is created with `git archive` from the committed release branch, including the browser-neutral Options wording follow-up and excluding unrelated uncommitted planning notes and screenshots. It contains the source, lockfile, static assets, tests and the public agent reference toolkit needed by the metadata consistency check. The full toolkit is not bundled into the installed extension.

From the source archive root, use Node.js 22.12 or newer:

```sh
npm ci
npm run build:firefox
```

The extension is in `dist/firefox/`. `npm run build` also builds Chrome and audits shared runtime parity. No external service credentials, proprietary libraries or real PeopleSoft account are needed to build. The build is Vite/TypeScript with classic-script bundling for the content script.

The source archive was extracted and built locally against the locked dependencies. All executable assets and the manifest match the upload build byte for byte. Four generated HTML copies differ only in LF/CRLF line endings; source maps also reflect source line endings. No executable-code difference was found.

## Testing without an organization account

Options, the popup, the Firefox sidebar and the local reference/documentation catalogs can be reviewed without signing into PeopleSoft. Local content-script regression fixtures are supplied in the source archive:

```sh
npm run test:e2e:firefox
```

Install Firefox first; Selenium Manager locates/downloads geckodriver. `FIREFOX_BINARY` and `GECKODRIVER` can select managed installations. The driver uses a disposable profile and localhost fixtures; its system-access flag is only for navigating extension documents in automation. The shipped add-on has no such privilege.

The eight Firefox scenarios exercise native sidebar opening, extension messaging/storage, Classic/Fluid UI, rendered axe/contrast checks, owning-frame Field Entry hooks, preview/apply separation, disabled environments/hosts, concurrent settings, schema-validated backups, clipboard clicks and trace consent/failure reporting. Local Firefox verification used 155.0.1 on Windows. The declared 140 floor/current-stable CI matrix is configured but has not run in this local submission session.

Organization-specific PeopleSoft access is needed for real page features. We do not provide or request employer credentials. PeopleTools 8.62 is a target; patch-level real-system validation remains separate from synthetic tests.

## Permissions and data

- `storage`: local settings, references, runbooks, favorites and explicitly saved workspaces/profiles.
- `tabs`: determine the active PeopleSoft URL for scoped sidebar/page actions and message the appropriate tab. Unrelated browsing history is not retained.
- Content-script matches cover PeopleSoft-shaped `psp`/`psc` paths. The optional local host allowlist can restrict activation further.
- No developer analytics, password storage, AI endpoint or remotely executed code. The manifest declares no developer/third-party data collection or transmission. Local use of page/business data is described in the attached privacy policy.
- Explicit trace requests use only the current PeopleSoft origin/session. Field Entry is opt-in and requires reviewed Apply; it does not save a PeopleSoft transaction.

## Validator warnings

The local Mozilla validator reports zero errors and 11 retained warnings. One concerns Android's data-consent version floor; this submission targets desktop. The other ten are five dynamic-template sites repeated in the content bundle and shared UI chunk:

- `src/features/favorites-ui.ts`: category/subcategory option attributes pass through `escapeAttr`.
- `src/features/field-entry-ui.ts`: eligibility values/title and profile-option labels pass through HTML escaping.
- `src/features/bar.ts`: Help/Pages use fixed markup branches; page-derived labels are populated using `textContent`.

Source maps are included for inspection. Warnings have not been suppressed, and the CSP has not been widened. These notes are evidence for review, not a claim of Mozilla approval.
