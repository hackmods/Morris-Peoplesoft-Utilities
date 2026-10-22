# E2E UI tests (Chrome and Firefox)

`npm run test:e2e` builds and exercises both installed extensions. The suite in this directory uses Playwright + Chromium; `tests/firefox/` uses Selenium + actual Firefox with Playwright reporting. Firefox must be installed; Selenium Manager obtains geckodriver, or set `FIREFOX_BINARY` / `GECKODRIVER`. Browser-specific commands are `npm run test:e2e:chrome` and `npm run test:e2e:firefox`. See [browser parity policy](../../docs/browser-support.md).

These tests load the **unpacked Chrome extension** from `dist/` against local PeopleSoft-shaped fixture URLs so Manifest V3 `content_scripts` match.

## Run

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

Or in one step: `npm run test:e2e` (builds first).

## Notes

- Chromium uses the full `chromium` channel in headless mode with a temporary profile.
- Fixture server: `http://127.0.0.1:4173` with paths like `/psp/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL`.
- Settings are seeded via `chrome.storage.local` (`quietEnvPrompt: Yes`, env label `DEV`) so the env naming prompt never blocks.
- Not part of `release:check`; run separately before Store uploads. Playwright's Chromium must be installed.

## Coverage

- Utilities bar mount (Fluid + Classic fixtures)
- Env flyout (Site / Portal / Node / ToolsRel / Theme / CREF)
- Page Info dialog
- Shortcuts flyout
- Options + popup pages
- Two Options tabs: independent feature edits merge; conflicting environment drafts report a conflict without overwriting or redirecting an edit
- Trace request-evidence dialog and disable cleanup; diagnostics preview/explicit download and selectable upgrade baseline history, including rendered axe checks
- Agent library filtering/deep links, blank task briefs and explicit copy with keyboard fallback, no rendering/search requests or settings changes, concurrent Options/side-panel favorites, synced recents and welcome dismissal, no automatic page snapshot, Help focus return, light/dark rendered contrast and 320 px reflow
- **Field Entry** (`field-entry.spec.ts`): Fluid + modal capture/paste/apply; From sheet; Find/Replace; Classic multi-row grid after the user clicks Add Row; Preview never adds rows
- Rendered axe checks with contrast enabled: extension pages, bar/flyouts, primary dialogs, Field Entry previews/profile dialogs (all reported WCAG 2A/2AA/2.1AA violations fail)
- Menu/submenu arrows, Home/End, Escape focus return, Tab exit, modal focus wrap, and 320 CSS-pixel bar/dialog bounds
- Blocked-host shortcuts/snapshots and multi-tab recent-history stability
- Process Scheduler excerpt/ticket reports: source citations, explicit timestamp and parent-label evidence, privacy masking, review-gated exports, invalid UTF-8, empty workspace handoff, keyboard and rendered contrast/reflow. The installed Firefox suite also exercises this workspace and its guarded entry point.
- Integration Broker versioned JSON evidence: metadata/stage citations, default payload omission and explicit inclusion/review, sensitive subtree masking, exact numeric tokens, duplicate-key/UTF-8 rejection, no storage/network changes, empty guarded handoff, keyboard and rendered contrast/reflow in both installed browsers; Chromium also checks dark mode.
- Expanded IB case workflow: form-based draft and explicit payload-file reads, v1/v2 envelopes, inert XML/SOAP and external-entity rejection, distinct JSON/XML tag citations, supplied observation times, selected two-record comparisons, precision/type differences, findings/checklist notes, stale-read cancellation and complete clear/reload. Both browsers render/audit the expanded controls and download the reviewed case report.
- Consolidation: actual Help/PCode destination loading, locked-field/manual-name/event/row-context preview and invalidation, runbook keep/discard/conflict/focus paths, ambiguous/changed ProcessPack selection, and Scheduler manual findings/citations/source focus. Installed Firefox also covers guided handoff keep/discard, production consent acceptance/revocation, immutable environment comparisons and configuration redaction/review/invalidation.

Synthetic fixtures do not establish real PeopleTools 8.62 compatibility. The narrow viewport is a reflow proxy, not a full browser zoom or screen-reader test. See `docs/testing/peopletools-8.62.md` for remaining release evidence.

## Field Entry fixtures

| Path | Fixture |
|---|---|
| `/psp/ps/EMPLOYEE/HRMS/c/HR_ADD_PERSON.PERSONAL_DATA.GBL` | Fluid “Modify a Person” style + `ptModFrame_0` address modal |
| `/psp/ps/EMPLOYEE/HRMS/c/JOB_DATA.JOB_DATA.GBL` | Classic `#ptifrmtgtframe` Job grid with Add Row |
