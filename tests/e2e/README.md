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

- Chromium runs **headed** (`headless: false`) because extension loading is unreliable in headless.
- Fixture server: `http://127.0.0.1:4173` with paths like `/psp/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL`.
- Settings are seeded via `chrome.storage.local` (`quietEnvPrompt: Yes`, env label `DEV`) so the env naming prompt never blocks.
- Not part of `release:check` (display / extension constraints). Run before Store uploads when UI changes.

## Coverage

- Utilities bar mount (Fluid + Classic fixtures)
- Env flyout (Site / Portal / Node / ToolsRel / Theme / CREF)
- Page Info dialog
- Shortcuts flyout
- Options + popup pages
- **Field Entry** (`field-entry.spec.ts`): Fluid + modal capture/paste/apply; From sheet; Find/Replace; Classic multi-row grid + Add Row

## Field Entry fixtures

| Path | Fixture |
|---|---|
| `/psp/ps/EMPLOYEE/HRMS/c/HR_ADD_PERSON.PERSONAL_DATA.GBL` | Fluid “Modify a Person” style + `ptModFrame_0` address modal |
| `/psp/ps/EMPLOYEE/HRMS/c/JOB_DATA.JOB_DATA.GBL` | Classic `#ptifrmtgtframe` Job grid with Add Row |
