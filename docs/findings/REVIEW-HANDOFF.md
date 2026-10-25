# Review handoff — resume here

Updated 2026-10-12 after the user requested continuation. This preserves knowledge independently of chat history.

## Commit/push continuation

Combined 1.0.26 validation passed: `npm run build` and `npm run release:check`, including **237 tests / 25 files**, coverage gates, all audits and both ZIPs. Extension ZIP: **351,691 bytes**; prompt pack: **53,431 bytes**. The screenshot audit still warns that `02-favorites.png` and `03-page-info.png` match generated mocks. Earlier browser results remain the runtime validation record; no extension runtime changes came from the remote integration.

The user subsequently requested committing and pushing the review. Remote `main` contained five newer commits, including version **1.0.26**, Store screenshot tooling/assets, and publishing guides. The review was rebased onto those commits; both sets of changes were preserved. Release workflow/readiness conflicts were resolved, lockfile version metadata synchronized, and `prep:store` now builds before auditing via `package`. The local/uncommitted state and 1.0.25 package sizes below describe the earlier review checkpoint. Use Git status/log for current publication state. The `.live-captures` marker added upstream does not itself verify screenshot provenance.

## Task and state

User requested a full repository review/fix for Chrome Web Store deployment, including agent instructions, targeting **PeopleTools 8.62**. They supplied legacy source at `C:/Users/Ryan/Projects/ps-utilities/4.2.1_0` for read-only comparison. Repo: `C:/Users/Ryan/Projects/Morris-Peoplesoft-Utilities`.

The working tree was clean initially. All current changes belong to this review. Nothing has been committed, pushed, tagged or published. Package version remains **1.0.25**; changes are under **Unreleased**. Do not discard these edits. No subagents were used. Do not edit `.cursor/plans`.

Read `AGENTS.md`, the full findings in `docs/findings/repo-review-2026-10-11.md`, and the live-system checklist `docs/testing/peopletools-8.62.md`.

## Implemented

- Host allowlist fails closed on malformed prefixes; shortcuts/snapshots and side-panel navigation honor page/feature/environment gating. Disabled pages clear active helpers; delayed search retries cancel.
- Content refreshes coalesce. Recent-component recording no longer creates a cross-tab feedback loop. Canceling environment registration now skips for the document session.
- Shared realm-independent DOM guards fix iframe Field Entry, page tabs, structure and upgrade fingerprints. Classic target iframe takes precedence over Fluid header detection. Site normalization only strips a trailing window suffix.
- Field Entry skips unsupported/hidden/disabled/password controls, rejects invalid select choices and ambiguous field/label matches, and revalidates value/connectivity before Apply. Change-hook scripts run in the written field's document.
- **Intentional behavior change:** Preview no longer clicks Add Row. Existing-row multi-row paste stays; users add missing rows in PeopleSoft. Removed unsafe synchronous global Add Row helpers.
- Shared CSV/TSV parser preserves multiline quoted cells and trailing blanks; rejects malformed widths/duplicate headers. Favorites CSV accepts the eight-column legacy layout and current Notes layout.
- Settings backup imports now validate a nested schema whitelist and merge partial feature maps safely.
- Continuation: saved settings recover valid entries without writing during reads; preserve environment indices with inactive placeholders; fail closed for unreadable host restrictions. Legacy migration/install cleanup tolerates null/corrupt entries and strips credentials.
- Trace form actions must stay same-origin; redirects are rejected; failed Stop retains the running indicator and warns. SQL Fetch uses a separate FETCH checkbox rather than reusing CURSOR. **Actual 8.62 checkbox IDs still need real-system verification.**
- Shared dialog focus trap, Escape after typing, restoration and cleanup. PeopleCode snippets use current `GetRow()` rather than invalid `GetRow(0)`/guessed scroll paths.
- Continuation: menu arrows/Home/End, submenu Left/Right, Escape focus return and Tab exit. Shortcuts search is outside its ARIA menu; empty Pages has a disabled menu item; Options muted text passes contrast. Submenu reposition listeners use the flyout abort lifecycle.
- Popup opens Side Panel directly from a click; side panel validates the active PeopleSoft URL. Install loads/migrates existing own-extension storage before defaults.
- Store short description shortened; Chrome 116 minimum declared; fresh package audited; LICENSE/NOTICE included. CI/release no longer regenerate mock artwork. Added headless Chromium CI job.
- Root/scoped agent instructions and Copilot entry point added; prompt pack targets Tools 8.62 and separates application release/PUM. Privacy, migration, accessibility and release docs corrected. `.cursor/plans` untouched; no upstream source copied.

## Latest verification

- `npm run release:check` **passed** after all runtime changes: lint, **234 tests / 24 files**, coverage gates, accessibility/store/compliance audits, production build and both ZIPs.
- Coverage: lines **83.68%**, statements 79.11%, branches 69.13%, functions 81.46%.
- Full browser run **17/17 passed**. Added Field Entry dialog/preview browser axe test then passed separately **1/1** (18 browser tests now present). Runtime changes are covered by these runs; only docs/tests changed afterward.
- Browser axe includes contrast and fails on every reported WCAG 2A/2AA/2.1AA violation. Covers rendered extension pages, bar/flyouts, primary dialogs and Field Entry preview/sheet/find-replace/profile dialogs.
- Browser checks include actual iframe writes/hooks, blocked-host shortcuts/snapshots, multi-tab history stability, menu/modal keyboard and 320 CSS-pixel bar/dialog bounds.
- Dependency audit earlier in this review: **0 vulnerabilities**. Dependencies unchanged afterward.
- Latest extension ZIP **351,875 bytes**, 59 entries; root manifest/version 1.0.25/Chrome 116, LICENSE/NOTICE, no agents/reference/dev folders/private keys. Prompt pack **53,427 bytes**, 35 entries including agents/AGENTS.md. Both ignored by Git.
- No checks remain running. No commit, push or publication. `git diff --check` clean at checkpoint.

## Next work, if requested

1. Local checks are complete; do not rerun unchanged tests merely to resume. Review the findings and outstanding real-system release gates.
2. ZIP inspection is complete. Current ZIP name is `morris-peoplesoft-utilities-v1.0.25.zip`, ignored by Git. Repackage only if runtime source changes after this checkpoint.
3. Complete real PeopleTools 8.62, screenshot, accessibility and Developer Dashboard work when the user provides the appropriate task/access. Do not publish without a separate request.

## Important limitations and possible follow-up

- Whole-object storage writes are still last-writer-wins across simultaneous contexts. The history loop is fixed; a transactional service-worker mutation design is separate follow-up.
- No employer PeopleSoft instance was accessed. Fixtures are synthetic; selectors, trace responses, field-change persistence and nested navigation require actual 8.62 testing.
- Trace running state is local bookkeeping, not a live server query. FETCH ID change intentionally fails closed if missing; verify delivered DOM before enabling trace.
- Browser contrast, menu keyboard and narrow-viewport checks now pass. Manual screen-reader, real browser zoom/text-size, forced-colors and live-system integration still need evidence. A 320 CSS-pixel viewport is a reflow proxy, not full zoom validation.
- Allowlist gates application behavior, not Chrome permissions. Browser-level restriction uses Chrome site-access controls.
- Store screenshots are still mock assets; remote CI status was not checked.
- Storage normalization is now in `src/storage/backup.ts`; reads never persist repairs. A later deliberate save can omit invalid data. Environment indices must never shift during recovery.
- Browser axe helper: `tests/e2e/helpers/accessibility.ts`. Shortcuts now uses a dialog wrapper containing a separate menu; corresponding ARIA assertions were updated.
- There is an old unused `splitCsvLine` export in `favorites-io.ts`; no need to remove solely for coverage.
- jsdom 29 returned grouped selector results out of DOM order in the modal test; focusables are explicitly sorted with `compareDocumentPosition` to keep keyboard order reliable.
- Check new iframe E2E hook test if it fails: `field-entry-write.js` is injected into the iframe, calls `window.addchg_`, and markers are currently cleared after 500 ms. This is a best-effort hook, not verified Oracle server persistence.

## Tool/environment notes

PowerShell on Windows; tools permit project writes but `.git` is read-only by default. Use `functions.exec` with `tools.exec_command`/`tools.apply_patch`. Tests/build require `sandbox_permissions: require_escalated` due Vite subprocess restrictions; previous npm-run escalations were approved. Avoid repeating a failed sandbox run. No browser installation was needed; Playwright Chromium was available.

Primary references are linked in the full findings: Oracle 8.62 Fluid/accessibility docs, Chrome Side Panel API, Chrome Web Store disclosure and Limited Use policies. These do not certify this extension.
