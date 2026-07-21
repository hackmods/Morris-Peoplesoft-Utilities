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

`npm run audit:a11y` runs axe-core (WCAG 2A/2AA) against popup and options markup.

## Manual checklist

See [testing/manual-parity-checklist.md](testing/manual-parity-checklist.md) accessibility section.

## Known limits

PeopleSoft application pages themselves may not meet WCAG AA. MPU does not claim to remediate Oracle-delivered UI; it aims to keep **MPU chrome** accessible.
