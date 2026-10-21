# Developer and administrator roadmap

Requested 2026-10-20. Ordered by implementation difficulty, adjusted for daily usefulness and reuse of existing features. Session estimates are planning ranges, not promises; each session ends with a tested, reviewable increment. The original option letters remain stable.

| Order | Option | Deliverable | Usefulness | Effort / sessions | Dependency |
|---|---|---|---|---|---|
| 1 | J — Guided agent handoffs | Structured intake, editable preview, explicit copy, preserve unfinished work when switching specialists | High; improves all 24 prompts | Small / 1 | Existing agent library |
| 2 | A — Oracle documentation hub | Search/filter verified 8.62 manual links, full library and HTML help, honest version fallback, application-family links, local favorites/recent references | High; daily developer/admin reference | Small–medium / 1–2 | Existing Options/side panel; reviewed Oracle catalog |
| 3 | D — Fluid navigation debugger | Read-only shell/frame/modal map, structural target candidates, inaccessible-frame labels, copyable diagnostics | High; promoted by user for current Fluid investigation | Medium / 2 | Existing frame adapters; real Fluid regression |
| 4 | K — Production awareness | Explicit environment classification, persistent production badge, confirmations for MPU field writes and trace start | High; fewer environment mistakes | Medium / 1–2 | Trace/Field Entry revalidation and environment settings |
| 5 | I — Environment runbooks | Local notes/approved links, component/environment association, validated team import/export | High for support teams | Medium / 2 | Storage schema, import validation, conflict handling |
| 6 | C — Environment comparison workspace | Two explicit snapshots, saved comparisons, metadata and missing-evidence warnings | High for release troubleshooting | Medium / 2–3 | Upgrade fingerprint model and snapshot boundaries |
| 7 | G — Configuration comparison | User-selected text exports, supported format parsers, secret masking, meaningful diff and reviewable export | High for administrators | Medium–large / 2–3 | File size limits, parser fixtures, safe export |
| 8 | E — Process Scheduler investigations | Extend ticket pack with imported logs, timeline and process relationship evidence | High for batch support | Large / 3 | Sanitized log samples; versioned parsers |
| 9 | F — Integration Broker investigations | Operation/node/queue evidence, imported sanitized message samples, routing/error checklist | High for integration teams | Large / 3 | Safe payload limits/redaction; evidence model |
| 10 | H — Upgrade evidence workspace | Multi-page baselines, comparison attachments, test outcomes, owners and unresolved findings | High during upgrades | Large / 3–4 | C and validated import/export |
| 11 | B — Local trace analyzer | Incremental file parsing, supported trace variants, timing/repeated-SQL summaries with source lines and uncertainty | Very high for performance specialists | Largest / 4+ | Sanitized representative traces, worker/performance budget, parser evaluation |

## Sessions and acceptance

### Session 1: J and A — implement now

- J: outcome, Tools patch, application/release/PUM, execution context, expected/actual result and sanitized evidence entered manually. The preview remains editable; generating/copying is explicit; switching specialists must not silently discard changes. No automatic page capture, AI calls or stored briefs.
- A: catalog metadata and links only, never bundled PDFs or background retrieval. Show the selected/detected Tools version and explicit fallback for unindexed versions. Keep application family separate from Tools and tell users to verify application release/PUM on Oracle. Search locally; external links carry no page context or referrer. Support local catalog-only favorites/recent choices without settings-refresh loops.
- Entry points: Options, side panel, and version-aware Help link. The hub is available alongside guided handoffs; a direct intake-to-hub shortcut remains a small follow-up.
- Tests: unknown/malformed versions, catalog links, bounded intake, dirty-preview switching, no automatic external requests, no brief persistence, narrow layouts, keyboard and rendered axe. Build, coverage, audits and E2E before packaging.
- Scope boundary: custom per-environment documentation profiles, PDF content search and automated retrieval are future extensions, not part of this first hub.

### Session 2: D — promoted into the current increment

Build D against synthetic Classic/Fluid/nested-modal fixtures, then record real-system outcomes separately. Structural target candidates must not be presented as proof of transaction ownership or unsaved changes. The implementation is included with J/A; live extension verification remains open.

### Sessions 3–4: K and I

Implement K first with explicit environment classification (never infer production from color). Confirm at MPU action time and revalidate after confirmation. Test disabling helpers mid-dialog, iframe ownership and genuine unsaved changes. Then add I with bounded local text/links, strict JSON validation and no remote scripts.

### Session 5: C

Build C from explicit snapshots and preserve origin/version/capture limits; never claim database or object equivalence from DOM evidence.

### Sessions 6–8: G, E and F

Begin each with sanitized sample files and parser acceptance cases. Support only named formats, enforce file/record limits, keep raw content in session memory, and preview exports. Server access is excluded; a live connector would require its own authentication and policy design.

### Sessions 9 onward: H, then B

For H, separate observed UI changes from uploaded App Designer/Change Assistant evidence and manually reported tests. For B, deliver one supported trace format first, then large-file handling and additional formats. Every derived finding needs source lines; missing timings or calls must remain unknown.

## Resume protocol

At each new session: read this file and the current git diff, select the next unfinished increment, state acceptance checks, implement only that increment, run relevant tests, then update the handoff below. Do not infer completion from an old backlog label. Keep releases separate from implementation; never replace a pending store submission merely to update this plan.

## Current handoff

- J, A and D: implemented in the 1.0.33 working tree. See the latest verification checkpoint below.
- K, I, C, G, E, F, H and B: planned, not implemented.
- Real-system Fluid save-warning verification remains open in `docs/testing/peopletools-8.62.md`.

## Oracle reference provenance

Catalog source: https://docs.oracle.com/cd/G41076_01/psft/index.html (PeopleTools 8.62, November 2025 manual set), checked 2026-10-20. Updates and version selection: https://docs.oracle.com/en/applications/peoplesoft/peopletools/index.html . Oracle links can redirect; a library match is not exact patch certification. Link titles/URLs are references, not instructions to load every manual into an agent.

## Scope update and checkpoint — 2026-10-20

User moved D (Fluid navigation debugger) immediately after J/A and requested execution in a subagent. D is implemented in this working tree with structural diagnostics and passing synthetic/browser tests; live extension verification remains pending. Revised next order: J, A, D, K, I, C, G, E, F, H, B.

Additional requests:
- Public PeopleSoft registry: see `docs/testing/public-peoplesoft-pages.md`; Niagara careers is observed publicly with sidebar/facets. User reports the save warning there. In-app observation had no MPU loaded; no live fix proof is claimed.
- PCode usefulness: first improvement adds prompt/docs navigation, removes misleading ready-to-paste wording and labels DOM occurrences accurately. Next dedicated session should replace generic placeholder snippets with event/row-context intake, curated verified examples, and an explicit no-field state. Do not claim the browser can inspect server PeopleCode.
- Activation transparency: popup now reports inactive on non-PeopleSoft URLs, confirms activity via a boolean-only content-script message, and explains psp/psc scoping and the optional host allowlist. No network interception APIs or expanded permissions added. Optional-origin permission redesign remains a separate future migration.
- Screenshots: actual public layout saved at `store/assets/submission/niagara-public-fluid-reference.png`. It is reference-only without MPU, not approved replacement store artwork or compatibility evidence. Capture actual extension on that site in a Chrome session with MPU available before publishing new live-use screenshots.

### Saved checkpoint — 2026-10-21

- Version 1.0.33 is built and packaged locally as `morris-peoplesoft-utilities-v1.0.33.zip` (461351 bytes). Source changes are saved in the accompanying 1.0.33 feature commit; no 1.0.33 store submission or GitHub release was made. Version 1.0.32 was previously submitted to Chrome.
- Implemented: J guided intake, A catalog of 45 verified Oracle PDF links, D structural Fluid diagnostics, PCode wording/reference improvements, and popup activation transparency.
- Added all 14 user-supplied public candidate sites to `docs/testing/public-peoplesoft-pages.md`, separately from the observed Niagara page. Their live status and compatibility are unverified. Parser tests cover representative site/portal/node, explicit-port and psp variants.
- Validation: lint passed; 310 unit/integration tests across 33 files passed; coverage gates passed (79.95% statements, 69.85% branches, 80.26% functions, 84.81% lines). These coverage results precede the final favorite-button focus repair.
- Browser validation: full run passed 30 of 31 scenarios; the Oracle hub scenario exposed focus loss when disabling its favorite button. The repair keeps the pending button focusable and guards duplicate clicks; the failed scenario then passed against a fresh build. All 31 scenarios passed across those runs, including rendered axe/contrast and narrow layouts. No coverage gates were weakened.
- Build, accessibility/store/compliance audits and package checks passed. Logs are local ignored `.roadmap-*.log` files. The final focus change passed TypeScript/ESLint and the focused rendered-browser test.
- Smaller-model agents completed initial edits before reaching account usage limits; the parent completed integration and verification. Sol implemented Fluid diagnostics.
- Remaining real-system evidence: reproduce the save warning with MPU enabled and disabled under identical settings; verify the diagnostic with the extension loaded; capture genuine extension-on-public-page screenshots. Niagara's saved screenshot is layout reference only. Do not claim a confirmed warning cause or PeopleTools patch compatibility.
- Next feature session: K production awareness, followed by I runbooks. Keep the dedicated PCode redesign and optional-origin permission migration separately scoped as described above.
- Preserve unrelated untracked store artwork and capture scripts. No additional release action is implied by this checkpoint.

