# Local build 1.0.29 — reliability, diagnostics and agent coverage

Recorded 2026-10-15. This records local implementation/verification and does not assert a published release, Store submission or real PeopleSoft certification.

## Included

- One service-worker settings write queue, baseline-aware three-way merging, stale-form conflict reporting and bounded retries for functional updates. Environment indices and URL mappings are treated together to prevent stale remapping across deletions. Reads still recover malformed settings without writing repairs; recent visits remain independent of refresh.
- Scoped, dated trace request evidence: requested, last-confirmed save responses, or unknown. Users choose explicit On/Off requests; access is revalidated between network steps and before POST. Partial failures never claim that trace stopped. Observed login/logout invalidates confidence; external/session changes remain unverifiable from local history.
- Editable diagnostics preview with explicit copy/download. The automatic report is an allowlisted configuration summary, excluding page/field values, hostnames, user IDs, object names, profile contents and session tokens. No upload or report persistence.
- Five dated upgrade baselines per component/environment, 50 overall, including imports. Explicit baseline selection enables reviewed cross-environment comparisons. Markdown handoffs include UI differences and manual evidence/test/dependency/rollback sections; no PeopleCode comparison, project creation or deployment.
- Focus restoration survives a settings-driven toolbar rebuild while a dialog is open.
- Prompt pack 4.1.0: 24 complete prompts, including Search Framework and portal/branding, with full Copilot/Cursor/Claude/Codex exports, three generic private-tailoring templates and 36 unexecuted evaluation cases. Existing per-prompt source-review dates remain truthful. The portal source ledger records the direct-PDF retrieval limitation.

## Verification

- `npm run release:check`: passed; lint/typecheck, 264 tests across 29 files, unchanged coverage gates, accessibility smoke tests and Store/compliance audits. Coverage: statements 80.11%, branches 70.28%, functions 82.71%, lines 84.69%.
- `npm run test:e2e`: all 23 Chromium tests passed. Includes two-tab independent/conflicting edits, recent-history stability, diagnostics preview/download/redaction, selectable baseline history, focus restoration after toolbar rebuild, trace evidence and disable/logout cleanup, rendered axe including contrast and narrow reflow, plus existing Classic/Fluid/frame/Field Entry regressions.
- All 24 exported skills passed skill-format validation. Catalog/frontmatter/link/export/case checks passed; these are structural checks, not executed model-behavior results.
- Extension ZIP: version 1.0.29, 59 entries, integrity passed, original `storage`/`sidePanel`/`tabs` permissions, no full agent definitions. Separate prompt ZIP: content 4.1.0, 143 entries, integrity passed; all 36 result records remain `not-run` with no response evidence.
- Windows filesystem-heavy prompt-pack tests have a scoped 30-second timeout; the new multi-step browser workflows have a 120-second overall timeout. Assertions and coverage thresholds were not relaxed.

## Remaining evidence

Real PeopleTools 8.62 patch-specific and assistive-technology checks require the target system. Actual Copilot/Claude/Codex trials require the selected host/model configuration. Private HCM/FSCM/Campus Solutions tailoring requires approved local definitions and owners; public templates remain unfilled. Two existing mock Store screenshots still need genuine reviewed replacements and updated captures for the current UI. See [release readiness](../release-readiness.md) and [ADR 0010](../adr/0010-settings-coordination-and-local-evidence.md).
