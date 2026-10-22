# Recent enhancements: quality consolidation review

Reviewed 2026-10-21 after the extended F increment. The user asked whether recent additions needed a fuller pass before adding features. This reviews the current working tree, feature boundaries and regression coverage; it is not a release or real-system compatibility sign-off.

**Decision: consolidate before H/B.** The initial assessment below found draft lifecycle, process-context and navigation defects, plus incomplete E/PCode workflows. The user then authorized implementation. See the consolidation result at the end; the original findings are retained as before-change evidence.

An implemented first increment is not the same as a complete operational workflow. The earlier E and initial F checkpoints describe their tested narrow scopes; neither establishes native PeopleSoft log/export compatibility. The extended F closes local workflow gaps, but still needs representative evidence.

## Confirmed defects to fix first

### 1. I: switching editor state silently loses unsaved work — high priority

- Reproduced in the installed Chromium extension: type a new title and notes, then select **New runbook**. Both controls become blank, without a discard decision. No data was saved by the probe.
- `src/features/runbooks-ui.ts`: `render()` rebuilds the editor from saved data; saved-item selection and New call it unconditionally. Reload and successful import also rebuild the editor. These adjacent paths need the same draft policy, rather than a repair only to New.
- Code inspection also found editable controls during asynchronous Save. Success renders the submitted snapshot, so later typing can be discarded. This race was not separately reproduced in the browser probe.
- Existing tests cover stale cross-tab revisions and preserve a draft on conflict; they do not establish ordinary local draft preservation.
- Acceptance: maintain an in-memory dirty draft; protect item switches, New, Reload and import completion with an explicit keep/discard flow. Preserve post-submit edits or make the editor inert while saving. Exercise failed/delayed saves, initial-load races, conflict recovery and focus restoration. Do not add automatic persistent drafts containing business notes.

### 2. ProcessPack: fields can belong to different process rows — high priority

- Reproduced with a temporary unit probe against current source: synthetic row A has instance `101`; row B has instance `202`, type `Synthetic Type B` and name `SYNTHETIC_B`. `collectProcessPack()` returns instance `101` with row B's name/type.
- `src/features/process-pack.ts`: each field independently takes the first matching visible element across the target document; label fallbacks also search the entire document. There is no common row/selection boundary.
- Impact: a support handoff can attribute evidence to the wrong process. E's optional pasted ticket evidence inherits this risk even though its report correctly labels the evidence as manual.
- Acceptance: resolve one explicit or demonstrably unambiguous process context. Collect all fields inside that context; refuse or explain ambiguous multi-row results. Missing fields stay missing. Cover complete/incomplete repeated rows, hidden duplicates, labels, owning frames and row replacement; do not interpret a DOM suffix as a PeopleCode row path.

### 3. A/PCode: page links to private Options fail in Chromium — medium priority

- Reproduced by clicking **Oracle documentation hub (PeopleTools version-aware)** in Help. The new tab loads `chrome-error://chromewebdata/` with `ERR_BLOCKED_BY_CLIENT` instead of the hub.
- `src/features/bar.ts` still creates direct page anchors to `options.html` for Help and the two PCode resources. `scripts/extension-manifest.ts` intentionally does not expose Options as a web-accessible resource. The PCode anchors share the affected pattern; they were inspected, not separately clicked in this probe.
- E/F already use guarded worker routes to open fixed internal destinations. Reuse that navigation boundary for the older entry points, including latest host/environment/feature/UI checks and bounded validated version context.
- Acceptance: click every content-page entry point in Chrome and installed Firefox and assert the destination's visible controls, not only its link URL. Test settings revocation and navigation before dispatch. Keep Options private; do not broaden the manifest exposure to make the links work.

## Which features need a fuller pass

| Area | Assessment | Bounded next work / completion evidence |
|---|---|---|
| I — Runbooks | Lifecycle uplift required | Repair the draft-loss paths above; test local transitions as thoroughly as cross-tab conflicts. Keep validated imports, revision serialization and explicit environment labels. |
| E — Scheduler | Largest remaining workflow gap | Add manual case scope, selected process context, expected/observed result, separately labelled run/distribution observations, evidence-linked findings and follow-up ownership. Review/export should carry unknowns and invalidation through source changes. Keep the current named excerpt parser; add native adapters only against representative authorized sanitized samples. |
| PCode | Dedicated redesign still unfinished | Explicit no-field state; ask for intended event and owning row/scroll context; offer a small curated set of examples whose context is stated and verified against Oracle 8.62 documentation during implementation. Avoid a generic copy-all bundle that appears ready to use. Browser metadata cannot inspect server PeopleCode. |
| G — Configuration comparison | Validate practical usefulness before expanding formats | Obtain representative sanitized INI/JSON exports and expected changes; test duplicates, case rules, arrays/order, exact numbers and conservative redaction against those examples. Evaluate report readability and worst-case nested paths/output allocation. Synthetic generic parsing does not establish effective server configuration. |
| C — Environment comparison | Retain design; strengthen scenario coverage | Verify ambiguous/changed owning frames, scope mismatches, missing metadata, saved evidence independence and concurrent edits in both browsers. Do not turn DOM snapshots into database/object equivalence claims. |
| D — Fluid debugger | Evidence gap, not justification for more controls | Complete the same-page helper-off/helper-on save-warning investigation with MPU actually loaded; exercise collection/modal ownership and keyboard/AT. Structural candidates remain uncertain. |
| K — Production awareness | Retain boundary; broaden Firefox action checks | Exercise accepted and cancelled writes, setting/navigation changes during consent, frame ownership and partial trace failure in both browsers. Real server acknowledgement and unsaved-change behavior need real-system checks. |
| J — Guided handoffs | Targeted regression pass | Preserve edited previews and intake across specialist changes; repeat discard/keep, no-persistence and keyboard flows in Firefox. No full redesign supported by this review. |
| A — Documentation hub | Fix entry points; retain hub | Verify destination loading and version fallback from real clicks; retain local catalog-only behavior. No full redesign supported by this review. |
| F — IB investigations | Local workflow expanded; sample validation remains | Validate authorized request/response, publication/subscription, gateway fault and transformed samples with expected citations. Keep native export adapters separate and named. Do not repeat a large synthetic-only expansion merely to claim completeness. |

E's initial scope was explicitly approved against synthetic samples. Missing native parsers are an evidence dependency, not a newly discovered parser defect. Workflow improvements can proceed with labelled synthetic cases; real-log support must remain unverified until tested. E/G currently check report byte limits after assembly; consider the incremental output budgeting already used by F as a focused resilience improvement, without claiming an unbounded allocation.

## Coverage gap and validation gate

The previous extended-F run passed 407 tests, 49 Chromium scenarios and 11 installed-Firefox scenarios, with unchanged coverage gates and dual-build/audit parity. These are aggregate results, not equal end-to-end coverage for every feature. Source review found dedicated Chromium C/G/I/J scenarios without corresponding full Firefox workflows; the Firefox production test covers cancellation/failed stop but not every accepted-action/revocation path. Asset parity cannot establish those behaviors.

For each repair, test the user's entire path: enter/open, edit, preview, change selection/settings, recover from a failure, export/save, and exit with sensible focus. Add regression cases that fail on the defects above. For browser changes, run a fresh dual build, unchanged coverage gates, full Chromium and installed-Firefox suites, rendered axe/contrast and audits. Keep real PeopleTools/assistive-technology outcomes separately recorded in `docs/testing/peopletools-8.62.md`.

## Revised execution order

1. Repair runbook draft loss, ProcessPack context and internal navigation, with failing-before/passing-after regression evidence.
2. Complete E's local investigation workflow and the already-open PCode redesign as separate reviewable increments.
3. Close high-risk Firefox journey gaps for I/C/G/J/K; validate G/E/F with representative sanitized samples when available. Lack of samples must not be replaced with native-format claims.
4. Reassess H, then B, after the known defects and local workflow gaps are closed. Keep external evidence dependencies visibly open rather than blocking all independent quality work.

## Review verification and boundary

The initial review ran a disposable local Chromium probe against the existing dual build and a temporary unit probe against ProcessPack source. Both reproduced the reported defects; temporary probe files were removed. At that stage, the Help failure was Chromium-confirmed and no production code had changed. The authorized implementation and verification below supersede that initial boundary.

## Consolidation result — 2026-10-21

| Item | Verdict | Implementation / evidence |
|---|---|---|
| Runbook draft lifecycle | SHIP | Inline keep/discard for New, switching, Reload, import and dirty deletion; Keep editing receives initial focus and Escape preserves the draft. Pending operations disable editing; failed operations retain drafts. Late older loads cannot replace a newer revision. Environment-choice refresh preserves notes and previously selected labels. Unit and browser Save/conflict/keyboard paths exercise the actual UI. |
| ProcessPack context | SHIP | Scope fields to a structural process row or unambiguous detail view. Require explicit row selection for repeated rows; arbitrary checked business controls do not count. Ignore hidden/password/MPU evidence and out-of-scope label targets. Explain unavailable context, keep the Scheduler entry point available, and recheck evidence before copying. |
| Help/PCode references | SHIP | Fixed internal worker routes with bounded version hints and sender/host/environment/feature/UI/navigation checks. Options remains private. Both browsers click through to visible destination controls. |
| PCode workflow | SHIP | No-lock guidance, verified record/field inputs for ambiguous DOM hints, explicit FieldChange/RowInit and row-context confirmation, one preview and guarded copy. Name/context changes invalidate it. Remove generic placeholder/copy-all bundles. Verify documentation assumptions against Oracle 8.62; server execution remains unverified. The named preview has an explicit region role after Firefox axe caught the missing semantic role. |
| E local investigation workflow | SHIP | Optional manual case/environment/window/instance, owner, expected/observed result, separate run/distribution observations, findings/follow-up and validated physical-line citations. Explicit source-scoped process focus does not join matching IDs across files. Changes invalidate review; Clear removes all case values. Manual claims remain unverified and conservatively masked. |
| E/G report allocation | SHIP | Enforce byte budgets while appending report rows. Nested-path regression proves G stops before visiting later records after budget exhaustion. |
| Firefox journey gaps | SHIP | Real installed-extension workflows for J keep/discard and no evidence persistence, K consent acceptance/revocation, C immutable saved comparison after source deletion, G redaction/review/invalidation, and polished I/E/PCode/ProcessPack. |
| C/A/J/K full redesign | SKIP | No evidence supporting wholesale replacement; retain their boundaries and verify the important user paths. |
| Native G/E/F formats / additional PCode contexts | DEFER | Require representative authorized sanitized samples or a separately scoped event/buffer example. No invented native grammar, server status, scroll path or effective configuration claim. |
| D live save-warning / real Tools patch / assistive technology | HUMAN | Synthetic fixtures, rendered axe and dual-browser tests cannot establish these outcomes. See the real-system matrix. |
| H/B product expansion | DEFER | This consolidation introduces neither roadmap option. Concurrent Trace SQL files appeared during verification; they were preserved, and colliding Options edits were merged so existing E/F remain available. No independent trace-feature design/compatibility sign-off is claimed here. |

Completeness gates:

- **Access:** local Options workspaces remain usable without site capture. Content-page reference/copy entry points require the appropriate active page and settings; foreign senders/child frames, disabled hosts/environments/features and stale navigation fail closed. These are extension boundaries, not Oracle security-role assertions.
- **Edge states:** no locked field, ambiguous names/process rows, no sources, reading, decode/limit/citation failure, failed or delayed save, revision conflict, source/context edits after review, settings revocation, successful preview/export, Clear and detached/page-exit callbacks have targeted coverage. New case sources retain typed notes with an explicit instruction to recheck citations; they do not silently verify them.
- **Discovery:** Options tabs plus Page Info/Help/PCode routes reach working controls; cross-feature Options wiring is retained alongside concurrent trace work. Names and manual assertions are plain text. The UI is English; native/localized dates and unsupported log formats remain unknown rather than being translated or guessed.
- **Adjacent state:** source selection clears process focus; evidence/case edits clear report approval; runbook environment changes update choices in place; record/event/context edits invalidate PCode; saved comparisons retain independent evidence. No new schema, permission, remote service, automatic capture or persistent investigation/code draft was added.

Review of delegated work: runbook implementation/tests were checked and refined for safe initial focus, environment updates and stale revision loads; ProcessPack was tightened beyond the first draft to reject arbitrary checked controls, hidden descendant text and cross-row label references; Firefox test scaffolding was corrected for stale elements and installation setup, with real UI saves restored rather than bypassing the failure using storage seeding. Parent review and browser gates determine acceptance, not worker reports.

Verification is recorded in the current roadmap handoff and applies to the tested build snapshot; independently continuing Trace SQL edits need their own fresh checks. Build/test/audit logs use ignored `.roadmap-quality-*.log` files. No commit, push, package, signing, publication or Store action was issued by this consolidation task; concurrent commits and unrelated work were preserved.
