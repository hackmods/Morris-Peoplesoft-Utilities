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
| FI-04 | **Fluid** field selectors (`ps_box-control`, data attrs) parity | BA, Dev | Customers mix Classic portal + Fluid pages | Keep Classic iframe path; add Fluid adapter branch |
| FI-05 | Large-grid performance: only decorate **visible** rows / debounce MutationObserver | Dev | Big scroll grids get sluggish with full wrap | IntersectionObserver or throttle |

### Page Info / environment awareness

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~PI-01~~ | ~~Richer Page Info: **DB name**, **DB type**, **Mode** (Classic/Fluid), app release when present in connection comment / `#pt_pageinfo`~~ | BA, Dev | Done in 1.0.9 | |
| ~~PI-02~~ | ~~**Copy as Markdown** / Jira snippet (Menu, Component, Page, ToolsRel, Rec.Fld if locked)~~ | BA | Done in 1.0.9 | |
| ~~PI-03~~ | ~~Toolbar **UI mode badge** (Classic / Fluid / Nav collection)~~ | BA, Dev | Done in 1.0.9 | |
| PI-04 | Persist last N **recent components** (local only) for quick re-open | BA | Complements Favorites without taxonomy | Cap list; no server sync |

### Favorites & navigation

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~FV-01~~ | ~~**Categories / subcategories** UI (legacy parity)~~ | BA | Done in 1.0.9 (optgroups + subcategory in label) | Options table still flat |
| ~~FV-02~~ | ~~Favorites **filter/search** in bar dropdown~~ | BA | Done in 1.0.9 | |
| FV-03 | Open favorite in **new window** option | Dev | Parallel compare in two envs | Combine with New Win site rules |
| ~~FV-04~~ | ~~Warn on export that favorites may contain **business keys** in Parameters~~ | BA | Done in 1.0.9 | Options confirm + hint |

### Trace & developer tooling

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| TR-01 | Trace Options UI: show **which flags** are on; named **presets** (SQL only, PeopleCode only, etc.) | Dev | Less tribal knowledge | Keep delivered UTILITIES POST protocol |
| ~~TR-02~~ | ~~Clearer **Trace 🔒** help when security blocks components~~ | Dev | Done in 1.0.9 | |
| TR-03 | Optional **ICSID / page token present?** indicator (boolean only, never display full token) | Dev | Debug postback / session issues | Do not copy secrets into clipboard by default |

### Search page helpers

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| SR-01 | Harden **Correct History** + **Advanced Search** for more PeopleTools versions / Fluid search | BA | Still flaky across releases | Prefer inject scripts; version-gate if needed |
| SR-02 | “Expand all search criteria” for Fluid search pages | BA | Parity with Classic expand | Fluid selectors in adapter |

---

## P2 — Strong BA/Dev UX after P1

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| ~~UX-01~~ | ~~Keyboard shortcuts: Page Info, Inspect toggle, copy locked field~~ | BA, Dev | Done in 1.0.9 (Alt+Shift+P/I/C) | |
| UX-02 | In-bar **component URL builder** (Menu.Component.Market + optional params) | Dev | Jump without Favorites | Validate against current site/portal/node |
| UX-03 | Environment **color strip** / stronger env affordance beyond underline | BA | Reduce wrong-env mistakes | AODA contrast check |
| UX-04 | Favorites **notes** field (local) | BA | “Use this for payroll calc test” | Export includes notes → warn |
| UX-05 | Field Inspector: show **input type / maxlength / disabled** chips | Dev | Quick HTML property check | From DOM attrs only |
| ~~UX-06~~ | ~~Page Info: include **portal / node / site** from parsed URL~~ | BA, Dev | Done in 1.0.9 | |
| UX-07 | **Compare** current Page Info to clipboard buffer (diff Menu/Component/ToolsRel) | BA | Cross-env checklist | Local string compare |
| UX-08 | Nav collection / nested iframe Field Inspector polish | Dev | Campus / content collections | Already partial via `.ps_target-iframe` |
| UX-09 | Options: per-feature **Classic vs Fluid** enablement | BA | Turn off noisy features on Fluid homepages | Schema + popup |
| UX-10 | Export **Page Info + locked field** into Favorites description template | BA | One-click documentation | |

---

## P3 — Larger / speculative (keep constraints)

| ID | Idea | Who | Why | Notes |
|---|---|---|---|---|
| SP-01 | CSP-safe **Page Tabs** revival (legacy dropped under MV3) | BA | Multi-page components | No `chrome-extension://` imgs in page; inline UI only |
| SP-02 | Lightweight **onboarding** checklist on first install | BA | Reduce support questions | Local flag; no telemetry |
| SP-03 | Shared team favorites via **file sync** only (import/export), never cloud account | BA | Collaboration without backend | Already CSV/JSON path — polish UX |
| SP-04 | PeopleTools **version tips** (“Inspect on 8.61 Classic iframes…”) | Dev | Context-sensitive help | From ToolsRel already parsed |
| SP-05 | Optional **side panel** (Chrome sidePanel API) for Favorites + Page Info | BA, Dev | More space than thin bar | New permission → privacy docs |
| SP-06 | Accessibility: high-contrast inspector borders / reduced motion already partial | BA | AODA | axe + manual |
| SP-07 | “Copy PeopleCode reference” formats: `&Record.FIELD`, `GetField(Field.FIELD)` snippets | Dev | Faster coding | User picks template |
| SP-08 | Detect login page password fields only to **place bar safely** — never read values | — | Layout only | Compliance-critical |

---

## Explicitly out of scope

- Password vaults, Quick Logins, storing PS credentials  
- Analytics, crash beacons, advertising SDKs  
- Server-side sync of settings/favorites  
- Scraping or exfiltrating employee/student PII beyond what the user already sees  
- Shipping `.reference/PS-Utilities` or private keys  

---

## Suggested sequencing (post Store)

1. ~~**FI-01, PI-02, PI-01** — documentation speed for BAs filing tickets~~ (shipped 1.0.9)
2. ~~**FV-01, FV-02** — favorites scale~~ (shipped 1.0.9)
3. **FI-04, SR-01** — Fluid / search reliability  
4. **TR-01, UX-02** — developer daily drivers  
5. P3 items only with ADR if they add permissions or major UI surface  

---

## Capture log

| Date | Note |
|---|---|
| 2026-07-21 | Initial backlog from Classic Inspect/Page Info work, legacy PS Utilities audit, BA/tech use cases, and PeopleTools 8.61 Classic+Fluid field reality |
| 2026-07-21 | Wave 1 implemented in v1.0.9 (FI-01..03, PI-01..03, FV-01/02/04, TR-02, UX-01/06) — plan: `.cursor/plans/implement-p1-wave1.md` |
