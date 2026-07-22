# Use cases — Technical

- **Trace:** Configure PeopleCode/SQL flags (or named presets: Off / Default / SQL / PeopleCode / Verbose) in Options → Tracing, then toggle Trace on the bar. The bar shows the active preset or flag count (e.g. `Trace ON · SQL`). Options includes a short guide on when to use SQL binds vs PeopleCode vs Verbose. Requires security access to delivered trace components. Cross-tab sync updates other tabs. 🔒 means UTILITIES access is missing.
- **Field Inspector:** Orange icons beside fields on Classic and Fluid (`ps_box-*`), including nav-collection nested iframes; viewport-scoped on large grids; Rec/Fld/Row (+ Label / Work / **Ctx** chips for Prompt, Display, Deferred / HTML type chips); high-contrast borders under forced-colors; click locks and copies PeopleCode formats (`RECORD.FIELD` / `&Record.FIELD` / `GetField` / `GetRowset…GetField`); Escape exits; Alt+Shift+C copies again.
- **Page Info / Page Tabs / Tips:** ToolsRel, DB, portal/node/site, UI mode, **CREF path**, **theme**, page-token present (boolean only); ToolsRel context tips; Markdown copy; **object pack** (plain + Markdown) with **Compare object pack**; Compare clipboard; **Copy process pack** on Process Monitor pages; IB breadcrumb line when on Integration Broker pages; Page Tabs from delivered multi-page links; **Customization upgrade watch** — capture UI fingerprint before upgrade and **Check upgrade drift** after (tabs, structure hosts, field ids — not PeopleCode).
- **PCode stubs:** Bar **PCode** button opens event stub checklist (FieldChange, RowInit, GetRowset, etc.) from locked field + page context; **Message / translate keys** section scans visible DOM for MsgGet / XLAT hints; copy one or all.
- **Structure:** Bar **Structure** button lists Fluid/Classic group boxes, scroll areas, grids, and related hosts plus CREF path / theme metadata when present (read-only).
- **Admin jumps:** Bar **Admin** flyout groups common setup components (Security, Portal, PeopleTools, Integration, Process, Reporting); uses your existing session.
- **IB breadcrumb:** On Integration Broker monitor pages, a compact bar chip shows Service Op / Queue / Node from visible DOM with **Copy IB**.
- **Go to / New Window / Recent / Side Panel:** Jump to Menu.Component.Market (Alt+Shift+G), open Favorites/Recent in `_newwin`, open the current component in a new tab, or use the Chrome Side Panel for Favorites + Page Info.
- **Login placement:** On sign-in pages the bar mounts above the password form container — credentials are never read.
- **UI scopes:** Options can limit Inspect / search helpers to Classic only, Fluid only, or both.
- **Backup:** Export full settings JSON from Favorites tab tools (import append or replace).

## Customization upgrade watch (UG-01)

1. Before a PeopleTools upgrade, open the customized component and **Page Info**.
2. Optionally enter notes, then **Watch customization** — saves a local UI fingerprint (tabs, Fluid/classic structure hosts, visible field ids, ToolsRel).
3. After upgrade (or on another env), open the same component and **Check upgrade drift** — results appear in the dialog diff area; severity is announced (clean / tools-only / drifted).
4. Manage baselines in **Options → Upgrade** — list, delete, export/import JSON. PeopleCode-only overrides still need App Designer Compare Report or Change Assistant.

## Planned enhancements

P3 Wave 5 items (SP-01…SP-08) shipped in **1.0.13**. Wave 6 (PC-01…03, FL-01, AD-01) shipped in **1.0.15**. Wave 6.1 (PC-04/05, FL-02/03, AD-02..04, TR-04/05) shipped in **1.0.16**. Wave 7 UG-01 (customization upgrade watch) shipped in **1.0.17**. Further ideas:

- [`docs/findings/future-enhancements.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/findings/future-enhancements.md)
