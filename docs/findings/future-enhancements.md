# Future enhancements — Morris PeopleSoft Utilities

**Audience:** business analysts (BA) and PeopleSoft developers/admins  
**Status:** living backlog for agents and humans  
**Constraints (non-negotiable):** no credentials / Quick Logins; no analytics/telemetry; settings in `chrome.storage.local` only; host allowlist remains opt-in; credit hackmods + PS Utilities authors in user-facing copy.

**Related:** [`.cursor/plans/future-enhancements.md`](../../.cursor/plans/future-enhancements.md) (agent plan), [legacy audit](./legacy-ps-utilities-audit.md), [classic tools audit](./classic-tools-audit.md), wiki use cases.

---

## How to use this doc

- Prefer items tagged **P1** when picking the next feature after Store readiness work.
- Each idea lists **who** (BA / Dev), **why**, and **notes** (Classic/Fluid, risks).
- Do not implement password vaults, remote logging, or advertising SDKs even if requested in issues.

---

## P1 — High value, fits current architecture

### Field Inspector

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~FI-01~~ | ~~One-click **copy** `RECORD.FIELD` (and row) to clipboard on lock~~ | BA, Dev | Done in 1.0.9 | Also Copy field button + Alt+Shift+C |
| ~~FI-02~~ | ~~Show **page label** text next to technical name when a `<label>` / `PSlabel` is nearby~~ | BA | Done in 1.0.9 | |
| ~~FI-03~~ | ~~**DERIVED_** / work-record badge in readout~~ | Dev | Done in 1.0.9 | Type: Work |
| ~~FI-04~~ | ~~**Fluid** field selectors (`ps_box-control`, data attrs) parity~~ | BA, Dev | Done in 1.0.10 | Classic iframe path retained |
| ~~FI-05~~ | ~~Large-grid performance: only decorate **visible** rows / debounce MutationObserver~~ | Dev | Done in 1.0.11 | Viewport + scroll reinject; full-page peer scan |

### Page Info / environment awareness

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~PI-01~~ | ~~Richer Page Info: **DB name**, **DB type**, **Mode** (Classic/Fluid), app release when present in connection comment / `#pt_pageinfo`~~ | BA, Dev | Done in 1.0.9 | |
| ~~PI-02~~ | ~~**Copy as Markdown** / Jira snippet (Menu, Component, Page, ToolsRel, Rec.Fld if locked)~~ | BA | Done in 1.0.9 | |
| ~~PI-03~~ | ~~Toolbar **UI mode badge** (Classic / Fluid / Nav collection)~~ | BA, Dev | Done in 1.0.9 | |
| ~~PI-04~~ | ~~Persist last N **recent components** (local only) for quick re-open~~ | BA | Done in 1.0.11 | Cap 12; no server sync |

### Favorites & navigation

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~FV-01~~ | ~~**Categories / subcategories** UI (legacy parity)~~ | BA | Done in 1.0.9 (optgroups + subcategory in label) | Options table still flat |
| ~~FV-02~~ | ~~Favorites **filter/search** in bar dropdown~~ | BA | Done in 1.0.9 | |
| ~~FV-03~~ | ~~Open favorite in **new window** option~~ | Dev | Done in 1.0.11 | Bar “New win” checkbox + `_newwin` |
| ~~FV-04~~ | ~~Warn on export that favorites may contain **business keys** in Parameters~~ | BA | Done in 1.0.9 | Options confirm + hint |

### Trace & developer tooling

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~TR-01~~ | ~~Trace Options UI: show **which flags** are on; named **presets** (SQL only, PeopleCode only, etc.)~~ | Dev | Done in 1.0.10 | Keep delivered UTILITIES POST protocol |
| ~~TR-02~~ | ~~Clearer **Trace 🔒** help when security blocks components~~ | Dev | Done in 1.0.9 | |
| ~~TR-03~~ | ~~Optional **ICSID / page token present?** indicator (boolean only, never display full token)~~ | Dev | Done in 1.0.11 | Page Info line only |

### Search page helpers

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~SR-01~~ | ~~Harden **Correct History** + **Advanced Search** for more PeopleTools versions / Fluid search~~ | BA | Done in 1.0.10 | Prefer inject scripts |
| ~~SR-02~~ | ~~“Expand all search criteria” for Fluid search pages~~ | BA | Done in 1.0.10 | MORE/expand loops in inject |

---

## P2 — Strong BA/Dev UX after P1

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~UX-01~~ | ~~Keyboard shortcuts: Page Info, Inspect toggle, copy locked field~~ | BA, Dev | Done in 1.0.9 (Alt+Shift+P/I/C) | |
| ~~UX-02~~ | ~~In-bar **component URL builder** (Menu.Component.Market + optional params)~~ | Dev | Done in 1.0.10 (Go to · Alt+Shift+G) | |
| ~~UX-03~~ | ~~Environment **color strip** / stronger env affordance beyond underline~~ | BA | Done in 1.0.11 | Left strip + tint via `--mpu-env-color` |
| ~~UX-04~~ | ~~Favorites **notes** field (local)~~ | BA | Done in 1.0.12 | Export warns |
| ~~UX-05~~ | ~~Field Inspector: show **input type / maxlength / disabled** chips~~ | Dev | Done in 1.0.11 | From DOM attrs only |
| ~~UX-06~~ | ~~Page Info: include **portal / node / site** from parsed URL~~ | BA, Dev | Done in 1.0.9 | |
| ~~UX-07~~ | ~~**Compare** current Page Info to clipboard buffer (diff Menu/Component/ToolsRel)~~ | BA | Done in 1.0.12 | Local string compare |
| ~~UX-08~~ | ~~Nav collection / nested iframe Field Inspector polish~~ | Dev | Done in 1.0.12 | Deep `.ps_target-iframe` resolve |
| ~~UX-09~~ | ~~Options: per-feature **Classic vs Fluid** enablement~~ | BA | Done in 1.0.12 | Inspect + search scopes |
| ~~UX-10~~ | ~~Export **Page Info + locked field** into Favorites description template~~ | BA | Done in 1.0.12 | Confirm on add |
| ~~UX-11~~ | ~~Bar **placement** (above content vs document top) + **sticky**; Classic absolute `#ptifrmtarget` offset so the bar does not cover Run / Process Scheduler~~ | BA | Done (Unreleased) | Main bar overlap, not flyout |

---

## P3 — Larger / speculative (keep constraints)

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~SP-01~~ | ~~CSP-safe **Page Tabs** revival~~ | BA | Multi-page components | **Done in 1.0.13** — dialog from delivered tab links |
| ~~SP-02~~ | ~~Lightweight **onboarding** checklist on first install~~ | BA | Reduce support questions | **Done in 1.0.13** — Options checklist + local flag |
| ~~SP-03~~ | ~~Shared team favorites via **file sync** only (import/export), never cloud account~~ | BA | Collaboration without backend | **Done in 1.0.13** — append/replace + import count |
| ~~SP-04~~ | ~~PeopleTools **version tips**~~ | Dev | Context-sensitive help | **Done in 1.0.13** — Page Info / Help from ToolsRel |
| ~~SP-05~~ | ~~Optional **side panel** (Chrome sidePanel API)~~ | BA, Dev | More space than thin bar | **Done in 1.0.13** — ADR 0008 + privacy |
| ~~SP-06~~ | ~~Accessibility: high-contrast inspector borders / reduced motion~~ | BA | AODA | **Done in 1.0.13** |
| ~~SP-07~~ | ~~“Copy PeopleCode reference” formats~~ | Dev | Faster coding | **Done in 1.0.13** — Options + bar select |
| ~~SP-08~~ | ~~Detect login page password fields only to **place bar safely**~~ | — | Layout only | **Done in 1.0.13** — never reads values |

---

## P4 — Wave 6: PeopleCode, Fluid structure, admin setup

**Goal:** Expose PeopleCode-oriented and Fluid/setup navigation that helps programmers and PS administrators without App Designer APIs, credentials, or PII scraping.  
**Constraints:** DOM/session local only; soft-fail on missing security; opt-in toggles where noisy; export warnings for business keys.  
**Plan:** [`.cursor/plans/implement-wave6.md`](../../.cursor/plans/implement-wave6.md)  
**Status:** Wave 6.1 shipped in **1.0.16** (PC-04/05, FL-02/03, AD-02..04, TR-04/05). First slice shipped in **1.0.15** (PC-01..03, FL-01, AD-01).

### PeopleCode aids

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| PC-01 | ~~**PeopleCode stub pack**~~ — **Done (1.0.15)** | Dev | Faster coding from page context | Pure local templates from `RECORD.FIELD` + Page Info; no server |
| PC-02 | ~~**Object clipboard pack**~~ — **Done (1.0.15)** | BA, Dev | Ticket/handoff speed | Extend Page Info actions; never include tokens/secrets |
| PC-03 | ~~**Grid / rowset copy formats**~~ — **Done (1.0.15)** | Dev | Scroll/grid PeopleCode | Extend `FieldCopyFormat` + inspector lock |
| PC-04 | ~~Deeper **prompt / display-only / deferred** chips from DOM~~ — **Done (1.0.16)** | Dev | FieldEdit context | DOM/ARIA only; follow-up after PC-01..03 |
| PC-05 | ~~**Message Catalog / translate** key detect + copy when present in DOM~~ — **Done (1.0.16)** | Dev, Admin | MsgGet / XLAT hunting | Only when keys already visible; no scraping |

### Fluid / page structure

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| FL-01 | ~~**Fluid structure tree**~~ — **Done (1.0.15)** | Dev, BA | Layout debugging without App Designer | Read-only overlay/dialog; Classic best-effort |
| FL-02 | ~~Portal / **CREF path** copy when Fluid nav exposes it~~ — **Done (1.0.16)** | Admin | Registry troubleshooting | Metadata only |
| FL-03 | ~~Theme / branding **clue** (id/family if in DOM)~~ — **Done (1.0.16)** | Admin | Env visual diffs | Boolean/id only; no asset download |

### Admin / setup navigation

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| AD-01 | ~~**Admin jump panel**~~ — **Done (1.0.15)** | Admin, Dev | Daily setup hops | Soft-fail / Trace-style 🔒 if unauthorized; uses existing session |
| AD-02 | ~~**IB breadcrumb** — Service Op / Queue / Node names when on IB pages~~ — **Done (1.0.16)** | Admin | Integration support | Copy + optional Shortcut; DOM-visible only |
| AD-03 | ~~Process Monitor **ticket pack** (Process Instance, type, run control from visible cells)~~ — **Done (1.0.16)** | Admin | Ops handoffs | Visible cells only |
| AD-04 | ~~Multi-env **object/field diff** (clipboard packs between tabs)~~ — **Done (1.0.16)** | BA, Dev | DEV vs QA vs PRD | Local string compare; extend Page Info Compare |

### Trace companion (optional follow-on)

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| TR-04 | ~~Bar summary of **which trace flags are on** + last toggle hint~~ — **Done (1.0.16)** | Dev | Avoid surprise verbose traces | Local settings only |
| TR-05 | ~~Short **flag chooser guide** (FieldChange vs SQL binds)~~ — **Done (1.0.16)** | Dev | Education | Docs + Options help text |

### Wave 6 suggested slice (implement first)

1. **PC-01, PC-02, PC-03** — PeopleCode stubs + object pack + rowset formats  
2. **FL-01** — Fluid structure tree (read-only)  
3. **AD-01** — Admin jump panel (permission soft-fail)  
4. Defer PC-04/05, FL-02/03, AD-02..04, TR-04/05 to Wave 6.1+

---

## Explicitly out of scope

- Password vaults, Quick Logins, storing PS credentials  
- Analytics, crash beacons, advertising SDKs  
- Server-side sync of settings/favorites  
- Scraping or exfiltrating employee/student PII beyond what the user already sees  
- Shipping `.reference/PS-Utilities` or private keys  
- App Designer / PSIDE remote APIs  

---

## Suggested sequencing (post Store)

1. ~~**FI-01, PI-02, PI-01** — documentation speed for BAs filing tickets~~ (shipped 1.0.9)
2. ~~**FV-01, FV-02** — favorites scale~~ (shipped 1.0.9)
3. ~~**FI-04, SR-01** — Fluid / search reliability~~ (shipped 1.0.10)
4. ~~**TR-01, UX-02** — developer daily drivers~~ (shipped 1.0.10)
5. ~~**FI-05, PI-04, FV-03, TR-03, UX-03, UX-05** — remaining P1 + key P2~~ (shipped 1.0.11)
6. ~~**UX-04, UX-07..10** — remaining P2 UX~~ (shipped 1.0.12)
7. ~~P3 items only with ADR if they add permissions or major UI surface~~ (shipped 1.0.13)
8. ~~**Wave 6 (PC-01..03, FL-01, AD-01)** — PeopleCode / Fluid / admin setup aids~~ (shipped 1.0.15)
9. ~~**Wave 6.1 (PC-04/05, FL-02/03, AD-02..04, TR-04/05)** — PeopleCode / Fluid / admin remainder~~ (shipped 1.0.16)
10. ~~**Wave 7 / UG-01** — Customization upgrade watch (UI fingerprint baseline + drift)~~ (shipped 1.0.17)

---

## P5 — Wave 7: Customization upgrade watch

**Goal:** Help BAs and developers spot UI/DOM drift on customized components after PeopleTools upgrades without App Designer APIs.  
**Constraints:** Local fingerprints only; no PeopleCode compare in-browser; export/import via JSON; credit PS Utilities lineage.  
**Status:** UG-01 shipped in **1.0.17**.

### Upgrade watch

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| UG-01 | ~~**Customization upgrade watch**~~ — capture UI fingerprint (tabs, structure hosts, field ids) + post-upgrade drift check | BA, Dev, Admin | Faster regression triage after upgrades | Page Info + Options → Upgrade; not PeopleCode |
| UG-02 | **Change Assistant handoff export** — structured notes from drift report for CA project docs | Admin | Ops workflow | Deferred — file/export only |
| UG-03 | **PeopleCode compare integration** | Dev | Full override detection | **N/A in browser** — use App Designer Compare Report |
| UG-04 | **Multi-baseline history** per object (last N captures) | Dev | Track drift across envs | Deferred |
| UG-05 | **Bar Upgrade chip** when watch exists for current component | BA | Faster re-check | Nice-to-have; Page Info buttons sufficient |

---

## Capture log

| Date | Note |
|---|---|
| 2026-07-21 | Initial backlog from Classic Inspect/Page Info work, legacy PS Utilities audit, BA/tech use cases, and PeopleTools 8.61 Classic+Fluid field reality |
| 2026-07-21 | Wave 1 implemented in v1.0.9 (FI-01..03, PI-01..03, FV-01/02/04, TR-02, UX-01/06) — plan: `.cursor/plans/implement-p1-wave1.md` |
| 2026-07-21 | Wave 2 implemented in v1.0.10 (FI-04, SR-01/02, TR-01, UX-02) — plan: `.cursor/plans/implement-wave2.md` |
| 2026-07-21 | Wave 3 implemented in v1.0.11 (FI-05, PI-04, FV-03, TR-03, UX-03, UX-05) — plan: `.cursor/plans/implement-wave3.md` |
| 2026-07-21 | Wave 4 implemented in v1.0.12 (UX-04, UX-07..10) — plan: `.cursor/plans/implement-wave4.md` |
| 2026-07-22 | Hierarchical Shortcuts + Pages flyout parity vs legacy screenshots |
| 2026-07-22 | **P4 / Wave 6 backlog** logged (PeopleCode stubs, object pack, Fluid structure, admin jumps) |
| 2026-07-22 | Wave 6 first slice shipped in **v1.0.15** (PC-01..03, FL-01, AD-01) — plan: `.cursor/plans/implement-wave6.md` |
| 2026-07-22 | **Wave 6.1** shipped in **v1.0.16** (PC-04/05, FL-02/03, AD-02..04, TR-04/05) — plan: `.cursor/plans/implement-wave6.1.md` |
| 2026-07-22 | **P5 / Wave 7 (UG-01)** shipped in **v1.0.17** — customization upgrade watch (UI fingerprint baseline + drift) |
| 2026-07-22 | **v1.0.18** — Field Inspector per-field wraps (Classic + Fluid) + Classic pages inside Fluid menus/nav collections |
| 2026-07-22 | **v1.0.19** — Shortcuts / Admin nested flyout submenus (fixed positioning, no clip / early close) |
| 2026-07-22 | **v1.0.20** — Options Features regroup (bar / helpers / careful) + PCode starter dialog clarity |
| 2026-07-22 | Env flyout (Site/Portal/Node/ToolsRel/Theme/CREF) + Playwright extension UI tests |
| 2026-07-23 | **UX-11** — bar placement (document top) + sticky; dismiss menus when entering Classic content iframe |
