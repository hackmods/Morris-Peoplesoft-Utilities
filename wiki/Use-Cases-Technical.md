# Use cases — Technical

- **Trace:** Configure PeopleCode/SQL flags (or named presets: Off / Default / SQL / PeopleCode / Verbose) in Options → Tracing, then toggle Trace on the bar. Requires security access to delivered trace components. Cross-tab sync updates other tabs. 🔒 means UTILITIES access is missing.
- **Field Inspector:** Orange icons beside fields on Classic and Fluid (`ps_box-*`), including nav-collection nested iframes; viewport-scoped on large grids; Rec/Fld/Row (+ Label / Work / HTML type chips); click locks and copies `RECORD.FIELD`; Escape exits; Alt+Shift+C copies again.
- **Page Info:** ToolsRel, DB, portal/node/site, UI mode, page-token present (boolean only); Markdown copy; Compare clipboard for cross-env diffs.
- **Go to / New Window / Recent:** Jump to Menu.Component.Market (Alt+Shift+G), open Favorites/Recent in `_newwin`, or open the current component in a new tab.
- **UI scopes:** Options can limit Inspect / search helpers to Classic only, Fluid only, or both.
- **Backup:** Export full settings JSON from Favorites tab tools.

## Planned enhancements

Remaining items are mostly P3 (ICSID already boolean-only; side panel would need privacy/ADR):

- [`docs/findings/future-enhancements.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/findings/future-enhancements.md)
