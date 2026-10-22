# Changelog

## Unreleased — repository review / PeopleTools 8.62

- Add Firefox desktop 140+ alongside Chrome 116+: shared MV3 manifest generation/version, browser API/sidebar adapter, separate validated browser packages, runtime asset parity audit, actual Firefox extension tests, and dual-browser CI/release checks. Future features and fixes must maintain both browsers in parity; Mozilla signing/publication and real-system PeopleTools verification remain separate steps.

- Fix Classic iframe Field Entry, page tabs, structure and upgrade fingerprints; notify the actual field document's change hooks.
- Enforce allowlist/environment/feature guards for shortcuts and page snapshots; cancel delayed search retries and prevent multi-tab recent-history loops.
- Make sheet preview read-only, preserve quoted multiline and empty CSV/TSV cells, reject ambiguous/unsafe targets, and revalidate fields before Apply.
- Validate settings backups before saving; preserve existing feature flags on partial restore.
- Recover malformed saved settings and legacy entries safely while preserving valid data and environment indices; fail closed on unreadable host restrictions.
- Add menu arrow-key navigation and focus restoration; correct Shortcuts/empty Pages ARIA semantics and Options text contrast. Add rendered browser axe and narrow-viewport regressions.
- Keep trace form posts on the current origin; distinguish SQL Fetch from Cursor and preserve the running indicator when Stop is not confirmed.
- Share modal keyboard/focus cleanup, fix Escape after typing, and avoid generating invalid PeopleCode `GetRow(0)` or guessed scroll paths.
- Validate Side Panel navigation context and open directly from popup clicks.
- Declare Chrome 116 minimum; audit freshly built packages, include license/credits, enforce short-description length, and preserve reviewed artwork in CI.
- Target PeopleTools 8.62 in repository and prompt-pack instructions; expand privacy disclosures and real-environment release checks.


All notable changes to Morris PeopleSoft Utilities are documented here.

## [Unreleased]

### Trace SQL investigations (Trace Magic marker port)

- Add Options → Trace SQL: select one sanitized `.tracesql` / `.trc` excerpt and preview a local hotspot report (SQL by duration, PeopleCode timed ends, call counts, error lines). Session memory only — no storage, network or new permissions.
- Parser `PeopleSoft tracesql markers v1` is a clean reimplementation of Trace Magic-style markers recovered from the RETM legacy desktop tool (not a vendor of Oracle Trace Magic source). Synthetic fixtures only; real PeopleTools patch compatibility unverified.
- Expand report parity: Trace Magic–compatible SQL IDs (`getMD5Hash`), SQL-by-FROM / SQL-by-WHERE aggregates, text plan tree with nest levels, accessible duration charts, privacy disclosure, and Options E2E smoke.

### Roadmap increment G — working tree, outside the prepared store candidate

- Add Options → Compare configuration for explicitly selected, bounded INI-style and JSON files. Reject duplicate keys and unsupported formats; retain source-line and type/missing evidence.
- Mask sensitive pairs before comparison, omit filenames, and require report review before copy/download. Inputs and reports remain in tab memory with explicit clear, no server access, storage or configuration writes.
- Document supported subsets and synthetic fixture provenance. Real export compatibility remains unverified; the prepared J/A/D/K/I 1.0.33 ZIP is unchanged.

### Roadmap increment C — working tree, outside the prepared store candidate

- Add explicit Page Info snapshot preparation and review, followed by Options → Compare environments with two user-selected captures, saved comparison history and reviewed text copy/download.
- Preserve portal/target origin and site, dates, versions and capture limits; warn about unknown PUM, incomplete captures and mismatched objects/UI. Browser metadata cannot establish server object or database equivalence.
- Keep comparisons in bounded separate local storage with revision conflicts and current-page/activation checks. Saved comparisons retain their own snapshot copies. Exclude MPU controls from page fingerprints.

### Roadmap increment K / I — working tree

- Add explicit environment classification and a persistent production badge, independent of greeting/color. Production keeps the toolbar at document top and sticky.
- Confirm each production Field Entry Apply and trace start; recheck current access, UI scope, classification and environment after consent. Revalidate field targets and values at Apply; keep trace stop available without production confirmation.
- Add Options → Environments local runbooks with bounded notes and approved HTTPS links, manual environment/component association, full JSON import preview, collision rejection and revision checks across views. Keep runbooks separate from settings/recent visits and export them separately.
- Preserve action/failure announcements through toolbar refresh. No version change or new permission. A 1.0.33 candidate containing K/I was prepared on 2026-10-21 after the release request; Chrome submission remains blocked by browser access. C is not in that candidate.

### Next build — 1.0.33

- Add guided, unsaved agent intake with editable preview and explicit draft-discard handling.
- Add the Oracle documentation hub: 45 official PeopleTools 8.62 PDF links, local search/topic filters, manual favorites/recents and explicit version fallback; application-family indexes stay separate.
- Add Structure → Fluid navigation debugger with bounded read-only frame/modal ownership clues and uncertainty labels.
- Show popup activation status; clarify URL scoping and lack of traffic interception. Link PCode starters to agent/docs workflows and correct row-context wording.
- Record a multi-session roadmap and public PeopleSoft test candidate registry. Live save-warning and extension-on-public-page screenshot verification remain open.

### Next build — 1.0.32

- Restrict automatic search helpers to explicit search-page containers and exact known controls. Skip already-selected Correct History and Advanced Search controls without a confirmed collapsed state.
- Remove generic More/Expand clicks and prevent action replay across retries or AJAX control replacement in the same document. Stop remaining automation after user edits, and cancel delayed work directly when disabled.
- Preserve PeopleSoft save warnings. This addresses unsafe automation; the reported live Fluid navigation-collection warning still requires real-system verification. Unrecognized search layouts are left for manual interaction.
- Make upgrade-watch captures disclose incomplete field scans, cap each capture at 200 unique field IDs, and warn when the current Page Info identity or UI context does not match the selected baseline.
- Document Page Info capture and comparison plus Options → Upgrade watch import/export. These checks compare browser UI fingerprints only; they do not compare SQL or PeopleCode.

### Next build — 1.0.31

- Open the local Agents library from the PeopleSoft toolbar or popup, with guarded Options fallback.
- Share audience filters, task shortcuts, favorites, recents and blank task briefs between the side panel and Options.
- Serialize local preference changes across views; keep brief text and searches unsaved, with no automatic page capture or remote prompt loading.
- Show the bundled catalog version and explicit instruction/download links.

### Prompt pack 4.2.0

- Add bounded Oracle retrieval, evidence reuse/freshness, proportional intake/output and cost-aware delegation to all standalone specialist instructions.
- Preserve PeopleSoft domain safeguards and source-review dates; add seven behavioral rubrics without claiming full host validation.
- Check shared instruction parity and reject unusable evaluation rubrics; regenerate all host exports and public catalog metadata.

### 1.0.30 — 2026-10-18

- Use the supplied October 18 PS/form icon, recolored in orange, black and white, at every Chrome icon size.
- Refresh both promotional tiles and all five store screenshots from actual extension UI.
- Standardize the extension on #FF5C00 and neutral grays, with dark text on orange actions and distinct outline patterns for field states. Preserve saved environment colors.

### Next build — 1.0.29

- Serialize settings writes in the service worker; merge independent edits and report conflicting stale drafts without redirecting collection indices. Retry functional updates against fresh state and preserve read-only recovery of malformed settings.
- Replace trace On/Off assertions with scoped, dated request evidence and explicit On/Off actions. Revalidate access before delayed network steps; incomplete results remain unknown.
- Add an editable diagnostics preview with an allowlisted configuration summary and explicit copy/download, without automatically including page values, hostnames or session context.
- Retain five upgrade baselines per component/environment (50 overall), offer explicit dated baseline selection, and preview/copy a Markdown upgrade handoff.
- Add complete Search Framework and portal/branding specialists across all host exports. Prompt pack 4.1.0 has 24 prompts and 36 unexecuted evaluation cases; existing source-review dates remain truthful.

### Next build — 1.0.28

- Adopt the UnionOps-inspired black/orange palette across Options, popup, side panel, injected bar/dialogs and future promo generation. Use shared accessible UI tokens and a versioned recolour of the existing PS icon; preserve prior artwork and genuine Store captures.
- Add audience search and a blank editable task brief for each agent reference, with explicit copy and manual-copy fallback. No PeopleSoft page context is captured or persisted.
- Reject stale prompt/reference exports at build time, and add a private host-evaluation worksheet that starts every prompt case as not run. Prompt maintenance revision: 4.0.1.

- Add Options → Agents: local search/filtering for 22 PeopleSoft prompt references and three private pillar templates, with entry links from popup, side panel and Help. Public documentation links omit referrer/page context; no AI execution, remote fetching or new permissions.
- Keep the reference catalog generated from prompt-pack metadata and update privacy/store disclosures. Preserve selected-tab/button contrast in dark mode.

- Expand the PeopleSoft prompt pack to content v4.0.0: 22 complete workflows, including BA requirements, PeopleCode authoring, AE/Scheduler, reporting, UAT, upgrades, approvals, trace/performance, Fluid development/accessibility, administration and conversion.
- Correct effective-date/status, PeopleCode meta-SQL/noninteractive and evidence-based security guidance; define a bounded read-only schema connector contract.
- Add private-tailoring HCM, FSCM and Campus Solutions templates; generate complete Copilot prompts, Cursor rules, Codex/Claude skills and restricted Claude agent definitions.
- Validate prompt catalogs, sources, links, export parity and evaluation coverage before packaging an explicit public file list. Host/model/real-system trials remain separately recorded as not run.

## [1.0.27] — 2026-10-13

- Replace the extension and store icons with the approved navy-and-gold PS artwork.
- Generate all Chrome icon sizes from the same source and protect the approved store icon from mock asset generation.

## [1.0.26] — 2026-08-07

### Added

- **Chrome Web Store submit path:** [`store/DEVELOPER_DASHBOARD.md`](store/DEVELOPER_DASHBOARD.md) walkthrough, [`store/incoming/`](store/incoming/README.md) + `npm run import:store-screenshots`, `npm run prep:store`, screenshot captions, mock-hash warnings in `audit:store`

### Changed

- **Store listing screenshots:** `01` (Roles search + Inspect), `04` (Field Inspector lock bar), and `05` (Options Features) refreshed via `npm run capture:store-screenshots`; `02` Favorites and `03` Page Info unchanged
- **Release workflow** no longer runs `generate:store-assets` on tag (avoids overwriting committed listing screenshots)
- **`generate:store-assets`** skips screenshot regeneration when `store/assets/screenshots/.live-captures` exists or `SKIP_STORE_SCREENSHOTS=1`
- Submission checklist and release-readiness docs updated for dashboard upload

## [1.0.25] — 2026-07-24

### Added

- **PeopleSoft agent prompt pack (v3):** nine portable AI agents under [`agents/`](agents/README.md) — `review-*` (data correctness, PeopleCode quality, security), `assist-*` (SQL/Query author, IB+CI integrations, MCP schema), `design-component`, `guide-onboarding`, `guide-specialist-trainer`; Quick starts; wiki [AI agent prompts](wiki/AI-Agent-Prompts.md); VS Copilot stubs in `agents/vscode-prompts/`; release also publishes **`morris-peoplesoft-agents-v*.zip`** plus a GitHub tree link (not shipped inside the Chrome extension zip)

### Changed

- Agent folders renamed for alignment (`review-*` / `assist-*` / `design-*` / `guide-*`); `npm run package:agents` / `release:check` builds the agents zip

## [1.0.24] — 2026-07-24

### Added

- **Field Entry toolkit (FE-01..06):** opt-in Entry bar menu (Optional / careful) — Capture editable field values, Paste with eligibility preview + highlight, From sheet (TSV/CSV; **multi-row → grid `$occ` + Add Row**), Find/Replace, named local profiles; works on **Fluid + Classic** and **same-origin modal/popup frames** (Modify a Person–style); **Alt+Shift+E**; never writes passwords; Playwright e2e coverage
- **Options → Utilities bar placement:** mount **Above content** (default) or at the **Very top of the site**, plus optional **Sticky while scrolling**
- **`agents/` PeopleSoft prompt pack (side toolkit, not shipped in the extension):** portable, generic markdown agents/skills for AI tools — see [`agents/README.md`](agents/README.md)

### Fixed

- **Classic utilities bar covering page actions:** `#ptifrmtarget` is absolutely positioned, so the bar no longer paints over the top of the content iframe — after `resizeAll`, MPU reserves the bar’s measured height (fixes half-covered Run / Process Scheduler buttons on run control pages). Re-applies when the bar wraps or the window resizes.
- **Open menus vs Classic page actions:** Shortcuts / Admin / Env / Pages menus also close when focus or pointer moves into the content iframe

## [1.0.23] — 2026-07-23

### Added

- **Env flyout:** click the Env chip for Site / Portal / Node / ToolsRel / Theme / CREF path + Copy
- **Playwright e2e:** extension UI tests against PeopleSoft-shaped fixtures (`npm run test:e2e`)

## [1.0.22] — 2026-07-22

### Changed

- **Shortcuts / Admin / Pages:** menus hang from the MPU bar (top chrome) instead of floating mid-page; still overlay page content below the bar by design

## [1.0.21] — 2026-07-22

### Fixed

- **Shortcuts / Admin / Pages menus:** portal open menus to `document.body` (escapes Fluid header overflow *and* transform clipping); restore on close
- **Page Info dialog:** wrap/group action buttons (Copy / Compare / Close) so they no longer overflow a single row

## [1.0.20] — 2026-07-22

### Changed

- **Options Features tab:** grouped toggles (Utilities bar / Page helpers / Optional·careful) with hints; clearer Preferences card for UI scope, field copy format, and quiet prompts; visual QOL refresh
- **PCode dialog:** clearer copy — these are App Designer paste starters (not live PeopleCode); lock a field with Inspect first so RECORD.FIELD is filled in

## [1.0.19] — 2026-07-22

### Fixed

- **Shortcuts / Admin flyouts:** nested Category » / SubCategory » panels were clipped by parent `overflow` and closed when the pointer crossed the gap — submenus now use fixed positioning with overlap + a short hide delay

## [1.0.18] — 2026-07-22

### Fixed

- **Field Inspector:** stop wrapping shared Fluid `.ps_box-control` / Classic multi-field parents as one mega highlight — each field gets its own orange border/icon again (Classic + Fluid)
- **Field Inspector:** Fluid menus / nav collections that host Classic pages in nested iframes — decorate from the outer content root, resolve nested Classic docs, and recover on late nested frame loads

## [1.0.17] — 2026-07-22

### Added

- **Wave 7 / UG-01 — Customization upgrade watch** (see `docs/findings/future-enhancements.md`):
  - **Page Info** — Watch customization (capture UI fingerprint with optional notes + env label) and Check upgrade drift vs saved baseline
  - **Options → Upgrade** — list watches, delete, export/import JSON
  - Compares tabs, structure hosts, and field ids — does **not** detect PeopleCode-only overrides

## [1.0.16] — 2026-07-22

### Added

- **Wave 6.1 PeopleCode / Fluid / Admin remainder** (see `docs/findings/future-enhancements.md`):
  - **Field Inspector context chips** — Prompt, Display, Deferred from DOM/ARIA (PC-04)
  - **Message / translate keys** — scan visible DOM for MsgGet / XLAT hints; copy from PCode dialog (PC-05)
  - **CREF path + theme** metadata in Page Info, object pack, and Structure dialog (FL-02, FL-03)
  - **IB breadcrumb** — compact bar chip + Page Info line on Integration Broker pages (AD-02)
  - **Process Monitor ticket pack** — copy visible instance/type/run control from Page Info (AD-03)
  - **Object pack compare** — clipboard diff for multi-env handoffs (AD-04)
  - **Trace bar hint** — preset name or active flag count on Trace button (TR-04)
  - **Trace flag guide** — plain-language help in Options → Tracing (TR-05)

## [1.0.16] — 2026-07-22

### Added

- **Wave 6.1** (see `docs/findings/future-enhancements.md`):
  - Field Inspector **Prompt / Display / Deferred** context chips (PC-04)
  - **Message / XLAT key** detect + copy from visible DOM in PCode dialog (PC-05)
  - **CREF path** and **theme/branding** clues in Page Info / Structure / object pack (FL-02/03)
  - **IB breadcrumb** chip + copy on Integration Broker pages (AD-02)
  - **Process Monitor ticket pack** copy from visible cells (AD-03)
  - **Compare object pack** clipboard diff on Page Info (AD-04)
  - Trace bar hint for active preset / flag count (TR-04)
  - Options Tracing **flag chooser guide** (TR-05)

### Fixed

- Packaging script archiver import for CI/`tsc` (`export =` interop) so tag releases can publish the Store zip
- Coverage gates: exclude `bar.ts` DOM wiring (helpers remain covered) so CI matches extracted-module thresholds

## [1.0.15] — 2026-07-22

> Note: The `v1.0.15` git tag’s GitHub Release zip failed CI packaging; features below ship in the **v1.0.16** Store zip.

### Added

- **Legacy Shortcuts / Pages parity**
  - Hierarchical **Shortcuts** flyout (Category → SubCategory → items), Shortcut Details dialog, per-item new window
  - **Pages** flyout with current-tab highlight (CSP-safe tab activation)
- **Wave 6 PeopleCode / Fluid / Admin** (see `docs/findings/future-enhancements.md`):
  - **PCode** dialog — FieldChange, FieldEdit, RowInit, SavePreChange, Component Pre/PostBuild, GetRowset stubs with per-stub and copy-all actions (PC-01)
  - **Page Info object pack** — plain + Markdown clipboard for Menu.Component.Page, portal/node/site, ToolsRel, UI mode, locked field (PC-02)
  - **GetRowset copy format** — `GetLevel0().GetRow(n).GetRecord().GetField()` when row occurrence is known (PC-03)
  - **Structure** dialog — read-only Fluid/Classic group, scroll, grid, and related host inventory (FL-01)
  - **Admin** flyout — grouped jumps to Permission Lists, Roles, User Profiles, Portal Structure, Message Catalog, IB monitors, Process Monitor, Web Profile, Query Manager (AD-01)

### Fixed

- Environment delete remaps `urlSites` indexes; Options toast/empty states/import guards; Page Info Escape

## [1.0.14] — 2026-07-21

### Fixed

- **Classic Field Inspector:** Inspect ON with zero orange icons on TargetContent pages
  - Viewport gating no longer uses Classic `<tr>` hosts (off-screen row geometry skipped every field)
  - Nested empty `.ps_target-iframe` no longer steals the Classic content document
  - MutationObserver reinject uses `nodeType` (cross-realm iframe safe)
  - Scroll/resize reinject listens on content frame windows; recovery poll always arms for Classic iframes

## [1.0.13] — 2026-07-21

### Added

- **Wave 5 P3 remainder** (see `docs/findings/future-enhancements.md`):
  - First-install **onboarding** checklist in Options (`showOnboarding`) (SP-02)
  - Favorites import **append / replace** + imported count (SP-03)
  - ToolsRel / UI-mode **tips** in Page Info and Help (SP-04)
  - Optional Chrome **Side Panel** (Favorites + Page Info) + ADR 0008; `sidePanel` + `tabs` permissions documented (SP-05)
  - High-contrast / forced-colors Field Inspector borders + reduced-motion notes (SP-06)
  - PeopleCode **copy formats**: `RECORD.FIELD`, `&Record.FIELD`, `GetField(Field.FIELD)` (SP-07)
  - Login bar mounts **above** the password form — never reads values (SP-08)
  - CSP-safe **Page Tabs** dialog from delivered tab links (SP-01)

## [1.0.12] — 2026-07-21

### Added

- **Wave 4 remaining P2 UX** (see `docs/findings/future-enhancements.md`):
  - Favorites **Notes** field (Options + CSV/JSON; export warn) (UX-04)
  - Page Info **Compare clipboard** diff (UX-07)
  - Nav collection / nested iframe Field Inspector bind (UX-08)
  - Options **Classic / Fluid / Both** scope for Inspect + search helpers (UX-09)
  - Add Favorite optional **Page Info description template** + notes prompt (UX-10)

## [1.0.11] — 2026-07-21

### Added

- **Wave 3 remaining P1 + key P2** (see `docs/findings/future-enhancements.md`):
  - Field Inspector: viewport-scoped decoration + scroll/resize reinject (FI-05); HTML type / maxlength / disabled chips (UX-05)
  - **Recent** components dropdown (local, capped) (PI-04)
  - Favorites / Recent **New win** checkbox using `_newwin` site rules (FV-03)
  - Page Info **Page token: present|not detected** boolean only — never shows ICSID value (TR-03)
  - Stronger environment color strip via CSS custom property (UX-03)

## [1.0.10] — 2026-07-21

### Added

- **Wave 2 Fluid / search / Dev tools** (see `docs/findings/future-enhancements.md`):
  - Field Inspector: Fluid `ps_box-*` selectors + wrap Fluid edit hosts without swallowing large groups
  - Search helpers: broader Classic iframe + Fluid detection; Advanced Search MORE/expand-all; Correct History selector fallbacks; late reinject retries
  - Trace Options **presets** (Off / Default / SQL / PeopleCode / Verbose) + active flag summary
  - In-bar **Go to** component URL builder (Menu.Component.Market) · **Alt+Shift+G**

## [1.0.9] — 2026-07-21

### Added

- **Wave 1 BA/Dev enhancements** (see `docs/findings/future-enhancements.md`):
  - Field Inspector: copy `RECORD.FIELD` on lock + Copy field control; nearby **Label**; **Work** badge for `DERIVED_`/`WRK_`
  - Page Info: DB name/type, AppsRel, UI mode, portal/node/site; **Copy Markdown** for tickets
  - Toolbar **Classic/Fluid/Nav** mode badge
  - Favorites **Category** optgroups + bar **filter**
  - Favorites CSV export **business-key warning**
  - Shortcuts: **Alt+Shift+P** Page Info, **Alt+Shift+I** Inspect, **Alt+Shift+C** copy field
  - Clearer Trace 🔒 help when UTILITIES security blocks access

## [1.0.8] — 2026-07-21

### Changed

- **Field Inspector readout:** show separate **Rec** / **Fld** / **Row** labels (inferred from other fields on the page) instead of one opaque `RECORD_FIELD` string; hide the yellow panel when empty

## [1.0.7] — 2026-07-21

### Fixed

- **Page Info:** capture Tools Release (`ToolsRel`) from multiline / document-level HTML comments and merge portal + Classic `TargetContent` meta (no longer requires `User`+`ToolsRel`+`AppServ` in one rigid regex)
- **Field Inspector (Classic):** icons never appeared in `#ptifrmtgtframe` because `instanceof HTMLElement` is false across iframe realms — use nodeType checks instead; real inline SVG icons (CSP-safe); prefer iframe element over unreliable `window.TargetContent`; reinject on load / MutationObserver / short poll for Classic AJAX

## [1.0.6] — 2026-07-21

### Fixed

- **Field Inspector:** icons use inline SVG (PeopleSoft CSP can block `chrome-extension://` images); resolve Classic `TargetContent` / wait for iframe; do not remount/resizeAll on Inspect toggle (that wiped icons); reinject after bar refresh
- **Tracing:** default feature flag is off for new installs (`traceOption: No`)

## [1.0.5] — 2026-07-21

### Fixed

- Classic tools audit remediation:
  - **Trace:** use delivered `psc/{site}_newwin` UTILITIES components with ICSID/`#ICSave` checkbox POSTs (was a fabricated mask POST that falsely reported success)
  - **Favorites clear-BCS:** restore `isMenuCrefNav` / `setStoredData` contract
  - **Bar mount:** prefer `#ptifrmtarget` above Classic content and call `ptIframe.resizeAll`
  - **User ID / search:** refresh when `#ptifrmtgtframe` loads; search injects require `PSSRCHPAGE`
  - **Correct History:** prefer `getElementsByName("PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C")`
  - **New Window:** resolve Menu.Component from target iframe; show only on components
  - **Login bar:** greeting (+ help) only
  - **Favorites URL:** keep window-specific site (`ps_2`) when navigating

### Added

- Classic tools audit write-up (`docs/findings/classic-tools-audit.md`)

## [1.0.4] — 2026-07-21

### Fixed

- Field Inspector parity with classic PS Utilities: inject orange magnifying icons beside PeopleSoft fields, show the record/field name on the bar on hover, and lock green on click (replaces hover-only tip that did not fully render on Classic pages).

## [1.0.3] — 2026-07-21

### Fixed

- Content script runtime error: Vite was emitting `content.js` as ESM with shared-chunk imports. Chrome loads content scripts as classic scripts, so the build now rebundles `content.js` as a self-contained IIFE.

## [1.0.2] — 2026-07-21

### Fixed

- Chrome load failure: `web_accessible_resources` match patterns must be origin-only (`*://*/*`). Path-scoped patterns like `*://*/psp/*` are rejected by Chrome with “Invalid match pattern.”

## [1.0.1] — 2026-07-21

### Added

- Release readiness doc with blocking vs nice-to-have Store submit items (`docs/release-readiness.md`)
- Expanded Store submission checklist aligned to pre-submit blockers
- Expanded automated test suites with coverage gates

### Changed

- Dependency upgrades (Vite 8, ESLint 10, Node types) for current CI toolchain
- Store listing mockup assets for dashboard preview

## [1.0.0] — 2026-07-21

### Added

- Greenfield Manifest V3 TypeScript extension (no jQuery)
- Feature parity targets: bar, user ID, environments, favorites, tracing, page info, field inspector, new window, Correct History, Advanced Search
- Opt-in host allowlist (default off)
- AODA-oriented UI (WCAG 2.1 AA intent) with axe CI
- Privacy policy, Store asset pack, wiki guides, GitHub Actions CI/release
- Migration from legacy PS Utilities storage keys when present

### Credits

- Maintained by hackmods (Ryan Morris)
- Inspired by PS Utilities (Uffe Graakjaer, Neil Yetman, and contributors)
