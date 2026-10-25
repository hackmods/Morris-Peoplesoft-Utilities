# Repository review — PeopleTools 8.62 / Chrome Web Store

Review date: 2026-10-11. Base package: 1.0.25. Changes are unreleased; no store upload or live PeopleSoft test was performed.

Commit/push continuation on 2026-10-12 integrated five newer remote commits and retained their **1.0.26** version, publishing tools/guides and updated screenshot assets. Version 1.0.25 test/package details below record the original review checkpoint. Screenshot provenance still needs verification despite the upstream `.live-captures` marker. See the handoff for combined validation and Git history for publication state.

## Scope and reference

Reviewed runtime entry points, adapters, features, storage/imports, popup/options/side panel, page-context scripts, tests, build/package/audit scripts, CI/release workflows, privacy/store materials, agent prompts and repository instructions. Compared the supplied local PS Utilities 4.2.1 source (`../ps-utilities/4.2.1_0`) with existing architecture/audit notes, especially manifest, installation and trace behavior. No legacy source or libraries were copied into the package. The reference remains read-only and outside this repository.

## Findings addressed

| Priority | Finding | Change |
|---|---|---|
| High | Allowlist accepted empty/malformed URL prefixes; shortcuts and Page Info messaging bypassed feature/host checks | Exact parsed origins; shared active-page state for shortcuts/snapshots; side-panel navigation validates PeopleSoft and environment context |
| High | Disabling an environment left inspection/search callbacks active | Suspend helpers, clear Field Entry memory/preview, cancel delayed search retries |
| High | Recent-history updates in different tabs could repeatedly displace each other's latest entry | Coalesce refreshes and record a component once per document navigation context |
| High | Top-window DOM `instanceof` checks excluded Classic iframe fields, tabs, structure and upgrade fingerprints | Realm-independent DOM guards plus iframe regression tests; change-hook injection uses the written field's document |
| High | Spreadsheet Preview clicked an arbitrary Add Row control, assuming synchronous grid creation | Remove automatic Add Row; preview is read-only and missing rows stay unmatched. Add rows in PeopleSoft before applying |
| High | Field Entry could overwrite changed/detached controls, clear invalid selects, or treat checkboxes/file inputs as text | Revalidate before Apply; skip hidden/disabled/read-only/ambiguous and unsupported controls; validate option and maxlength |
| High | Settings restore accepted any object, allowing broken arrays, unknown/credential fields and invalid flags | Schema whitelist and nested validation before storage write; partial feature maps merge with existing flags |
| Medium | Preexisting corrupt settings could crash startup or misidentify environments | Recover valid entries without read-time writes; preserve environment indices using inactive placeholders; unreadable host restrictions fail closed; installation cleanup tolerates null legacy entries |
| High | Trace followed untrusted form actions and reported Stop despite failure | Same-origin action validation; reject redirects; retain running indicator after failed Stop and warn about partial results |
| Medium | Legacy SQL Fetch incorrectly shared Cursor's checkbox ID | Separate FETCH mapping; missing delivered controls fail closed. Confirm actual 8.62 patch DOM before enabling trace |
| Medium | CSV/TSV parsing split quoted multiline cells and stripped trailing empty values | Shared record parser, quoted-line preservation, row-width/duplicate-header checks |
| Medium | Modal focus could escape; Go To consumed its Escape listener on the first key | Shared modal keyboard lifecycle, focus containment/restoration and removal cleanup |
| Medium | Menus lacked arrow navigation/focus return; dynamic ARIA and contrast issues escaped static audits | Add menu/submenu keyboard handling and return focus before opening dialogs; put Shortcuts search outside its menu; give empty Pages a disabled menu item; darken Options muted text |
| Medium | Generated PeopleCode used `GetLevel0().GetRow(0)` and guessed scroll paths from DOM suffixes | Use current `GetRow()` context; explicitly require developer verification of event/scroll path |
| Medium | Side Panel opened after asynchronous messaging, risking lost user activation | Open directly from the popup click after resolving the tab during initialization |
| Medium | Install defaults could preempt same-extension legacy migration | Load/migrate existing settings before applying onboarding defaults; document cross-extension storage isolation |
| Medium | Store description exceeded its own 132-character limit; Chrome minimum unspecified; package audit could inspect stale output | Shorten copy, audit lengths/version/minimum, declare Chrome 116, audit after package build |
| Medium | CI/release regenerated placeholder store artwork | Use checked-in reviewed assets; generators remain explicit developer commands |
| Medium | Privacy copy omitted local history/watch data and overstated allowlist injection restrictions | Describe local data use/retention/exports, tab URL access and application-level gating accurately |
| Medium | Prompt pack conflated PeopleTools and application versions | Make PeopleTools 8.62 primary; ask separately for pillar/application release/PUM; expand root and scoped agent instructions |

## Validation

Final local verification completed 2026-10-12. The automated suite uses synthetic DOM and local fixtures; it does not certify Oracle compatibility or WCAG conformance.

- Dependency audit (`npm audit --json`): **0 known vulnerabilities**.
- `npm run release:check`: passed, including lint, **234 tests across 24 files**, coverage thresholds, accessibility/store/compliance audits, build and both ZIPs. Coverage: 83.68% lines, 79.11% statements, 69.13% branches, 81.46% functions.
- `npm run test:e2e`: **17/17 passed**, including actual Chromium iframe writes/change hooks, blocked-host shortcuts/snapshots, multi-tab history stability, browser axe with contrast, menu/modal keyboard, and 320 CSS-pixel bar/dialog bounds. The subsequently added Field Entry dialog/preview browser axe test also passed (**1/1**, now 18 browser tests in the suite).
- Browser axe checks rendered options/popup/sidepanel, bar/flyouts, primary dialogs, and Field Entry previews/profile dialogs. Every reported WCAG 2A/2AA/2.1AA violation fails the browser test; contrast is enabled. Fixtures remain synthetic.
- Extension ZIP inspected: 59 entries; root manifest version 1.0.25 and Chrome minimum 116; LICENSE/NOTICE present; no agent/reference/development folders or private keys. Separate prompt pack: 35 entries.
- Latest local packages: extension 351,875 bytes; prompt pack 53,427 bytes. Both remain ignored by Git.
- `git diff --check`: passed. Changes remain uncommitted and unpublished.

## Release blockers requiring real evidence

1. Complete [PeopleTools 8.62 validation](../testing/peopletools-8.62.md), especially actual trace checkbox IDs/save responses, changed-field persistence, nested navigation and delivered search controls. No employer system was accessed during this review.
2. Replace the existing mock Store screenshots with sanitized captures. Verify listing and privacy declarations in the current Developer Dashboard; complete publisher/account requirements and submit the selected build.
3. Perform manual zoom/text-size, forced-colors, screen-reader and real-system keyboard checks. Automated Chromium contrast and narrow-viewport checks now pass, but are not an accessibility certification or a complete browser zoom test.

## Follow-up engineering risks

- Settings still use whole-object `chrome.storage.local` writes. Simultaneous edits from separate contexts can be last-writer-wins. A service-worker mutation queue or separate per-domain keys would address this; the recent-history feedback loop is fixed, but this is not a transactional storage redesign.
- Field IDs, label matching, metadata comments and delivered search/trace hooks remain best-effort. A DOM-derived record name is not authoritative App Designer metadata. Multiple matching targets are skipped; custom controls and cross-origin frames are outside automated write support.
- Trace “running” is local state from requested actions, not a live server query; session expiry, external trace changes and failures require verification in PeopleSoft.
- The optional allowlist gates application behavior; it does not narrow Chrome's already-declared matching permissions. A browser-enforced optional-host-permission redesign would need an ADR, migration and store permission review.
- Menu keyboard conventions and dynamic-control axe coverage now have Chromium regressions. Sustained performance on very large real grids still needs measurement; no claim is made that all accessibility or performance issues have been eliminated.

## Primary sources used

- [Oracle PeopleTools 8.62 Fluid guide](https://docs.oracle.com/cd/G35126_01/psft/pdf/pt862tflu-b062025.pdf) and [8.62 accessibility report](https://docs.oracle.com/en/corporate/accessibility/templates/t2-15706.html) for target UI context; neither validates this extension's selectors.
- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) for the Chrome 116 minimum and user-gesture requirement.
- [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies), [disclosure requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements) and [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use) for accurate data-use/store disclosures. Passing repository audits does not guarantee Store approval.
