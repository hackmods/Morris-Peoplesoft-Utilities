# E2E UI tests (Playwright)

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
- Agent library filtering/deep links, blank task briefs and explicit copy with keyboard fallback, no rendering/search requests or storage changes, Help focus return, light/dark rendered contrast and 320 px reflow
- **Field Entry** (`field-entry.spec.ts`): Fluid + modal capture/paste/apply; From sheet; Find/Replace; Classic multi-row grid after the user clicks Add Row; Preview never adds rows
- Rendered axe checks with contrast enabled: extension pages, bar/flyouts, primary dialogs, Field Entry previews/profile dialogs (all reported WCAG 2A/2AA/2.1AA violations fail)
- Menu/submenu arrows, Home/End, Escape focus return, Tab exit, modal focus wrap, and 320 CSS-pixel bar/dialog bounds
- Blocked-host shortcuts/snapshots and multi-tab recent-history stability

Synthetic fixtures do not establish real PeopleTools 8.62 compatibility. The narrow viewport is a reflow proxy, not a full browser zoom or screen-reader test. See `docs/testing/peopletools-8.62.md` for remaining release evidence.

## Field Entry fixtures

| Path | Fixture |
|---|---|
| `/psp/ps/EMPLOYEE/HRMS/c/HR_ADD_PERSON.PERSONAL_DATA.GBL` | Fluid “Modify a Person” style + `ptModFrame_0` address modal |
| `/psp/ps/EMPLOYEE/HRMS/c/JOB_DATA.JOB_DATA.GBL` | Classic `#ptifrmtgtframe` Job grid with Add Row |
