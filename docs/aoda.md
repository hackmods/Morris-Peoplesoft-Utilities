# AODA / Accessibility

Morris PeopleSoft Utilities targets **AODA** alignment via **WCAG 2.1 Level AA** for:

- Extension popup
- Options pages
- Injected utilities bar and dialogs

## Requirements

- Keyboard operable controls (Tab, Enter/Space, Escape)
- Visible focus indicators
- `aria-label` / accessible names on icon-only buttons
- Status text + icons (not color alone) for Trace / Inspect pressed states
- `aria-live` announcements for inspector and trace status
- `prefers-reduced-motion` respected
- Dialogs use `role="dialog"`, `aria-modal`, labelled titles, focus to close control

## Automated checks

`npm run audit:a11y` runs axe-core (WCAG 2A/2AA) against popup, options and side-panel markup. These jsdom checks disable color contrast and filter serious/critical findings.

`npm run test:e2e` also runs axe in Chromium with contrast enabled and fails on every reported WCAG 2A/2AA/2.1AA violation. It covers rendered extension pages, the bar, flyouts, Page Info/PeopleCode/Structure/Go To/Help dialogs, and Field Entry capture previews/sheet/find-replace/profile dialogs. Keyboard tests cover menu arrows, submenu levels, Home/End navigation, Tab exit, modal focus containment and Escape focus return. A 320 CSS-pixel viewport checks bar/dialog bounds as a reflow proxy.

These synthetic fixtures do not certify WCAG conformance. Manual browser zoom/text-size, forced-colors, screen-reader and real PeopleSoft integration checks remain release gates. A narrow viewport is not a full browser zoom or assistive-technology test.

## Manual checklist

See [testing/manual-parity-checklist.md](testing/manual-parity-checklist.md) accessibility section.

## Known limits

PeopleSoft application pages themselves may not meet WCAG AA. MPU does not claim to remediate Oracle-delivered UI; it aims to keep **MPU chrome** accessible.
