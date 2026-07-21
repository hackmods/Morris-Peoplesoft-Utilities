# Plan — Implement P1 BA/Dev enhancements (Wave 1)

**Branch:** `cursor/implement-p1-enhancements-8d9d`  
**Version target:** 1.0.9  
**Source backlog:** `docs/findings/future-enhancements.md` sequencing step 1–2

## In scope (this PR)

| ID | Deliverable |
|---|---|
| FI-01 | Copy `RECORD.FIELD` (row) to clipboard on Field Inspector lock; Copy control on readout |
| FI-02 | Show nearby page **label** text in readout when discoverable |
| FI-03 | **Work** badge for `DERIVED_` / obvious work-record prefixes |
| PI-01 | Richer Page Info: DB name, DB type, app release, UI mode |
| PI-02 | Page Info **Copy** + **Copy Markdown** (includes locked field when present) |
| PI-03 | Toolbar **UI mode** badge (Classic / Fluid / Nav) |
| UX-06 | Page Info includes portal / node / site from URL |
| FV-01 | Favorites `<select>` grouped by **Category** (`optgroup`) |
| FV-02 | Favorites **filter** input on the bar |
| FV-04 | Favorites CSV export warning (business keys) in Options |
| TR-02 | Clearer Trace 🔒 button title / announce |
| UX-01 | Shortcuts: `Alt+Shift+P` Page Info, `Alt+Shift+I` Inspect, `Alt+Shift+C` copy locked field |

## Out of scope (later waves)

FI-04 Fluid selectors, FI-05 grid virtualization, PI-04 recents, FV-03 new-win favorite, TR-01 presets, TR-03 ICSID boolean, SR-*, P2/P3 except UX-01/UX-06/FV-04 as listed.

## Implementation notes

- Extend `PageMeta` + `parseConnectionComment` for `DBName` / `DBType` / `AppsRel` (flexible key aliases).
- `showPageInfoDialog` builds plain + markdown; wire both buttons.
- Field inspector: `copyLockedField()`, label heuristic, work-record badge in `setNamePanel`.
- Bar: mode badge, favorites filter + optgroups, keyboard handler in content script.
- Update tests, wiki Commands, CHANGELOG, backlog capture log (mark IDs done).

## Done when

- `npm run lint` && `npm run test:unit` (+ coverage gate)
- CHANGELOG 1.0.9 + wiki blurbs
- Backlog rows struck / capture log updated
