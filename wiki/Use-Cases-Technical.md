# Use cases — Technical

- **Trace:** Configure PeopleCode/SQL flags (or named presets: Off / Default / SQL / PeopleCode / Verbose) in Options → Tracing, then toggle Trace on the bar. Requires security access to delivered trace components. Cross-tab sync updates other tabs. 🔒 means UTILITIES access is missing.
- **Field Inspector:** Orange icons beside fields on Classic and Fluid (`ps_box-*`), including nav-collection nested iframes; viewport-scoped on large grids; Rec/Fld/Row (+ Label / Work / HTML type chips); high-contrast borders under forced-colors; click locks and copies PeopleCode formats (`RECORD.FIELD` / `&Record.FIELD` / `GetField`); Escape exits; Alt+Shift+C copies again.
- **Page Info / Page Tabs / Tips:** ToolsRel, DB, portal/node/site, UI mode, page-token present (boolean only); ToolsRel context tips; Markdown copy; Compare clipboard; Page Tabs from delivered multi-page links.
- **Go to / New Window / Recent / Side Panel:** Jump to Menu.Component.Market (Alt+Shift+G), open Favorites/Recent in `_newwin`, open the current component in a new tab, or use the Chrome Side Panel for Favorites + Page Info.
- **Login placement:** On sign-in pages the bar mounts above the password form container — credentials are never read.
- **UI scopes:** Options can limit Inspect / search helpers to Classic only, Fluid only, or both.
- **Backup:** Export full settings JSON from Favorites tab tools (import append or replace).

## Planned enhancements

P3 Wave 5 items (SP-01…SP-08) shipped in **1.0.13**. Further ideas:

- [`docs/findings/future-enhancements.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/findings/future-enhancements.md)
