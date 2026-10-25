# PeopleTools 8.62 validation

Chrome and Firefox are maintained in parity. Record browser name/version with every real-system result and repeat the matrix for each browser. Firefox synthetic extension tests and package validation do not establish real PeopleTools 8.62 compatibility. See [browser support](../browser-support.md).

Primary compatibility target: **PeopleTools 8.62**. This is a validation plan, not a certification. Synthetic fixtures and generated screenshots do not establish support on an employer's installation.

On 2026-10-12, the maintainer confirmed in the publishing chat that the extension
had been tested and requested initial publication before further polish. No
patch-level or scenario-by-scenario results were supplied, so the detailed matrix
below remains unverified. This records the maintainer's statement, not an
independent compatibility certification.

Record Tools patch (`8.62.xx`), application pillar/release, PUM image, browser version, UI model, tester/date, and outcome. Keep employer-specific results and sanitized captures outside the public repository.

| Scenario | Acceptance | Status |
|---|---|---|
| Classic / Classic Plus inside Fluid portal | Bar does not cover Run/Save; inspector, Page Info, tabs, structure, and upgrade fingerprint read target iframe | Real-system test needed |
| Fluid component and navigation collection | Correct UI scope; late/nested frames refresh once and remain usable | Real-system test needed |
| Modal / popup frame | Field Entry sees same-origin editable fields, skips hidden/disabled/password and ambiguous controls | Real-system test needed |
| Field Entry capture, CSV/TSV, profiles | Preview does not add rows; unmatched rows visible; Apply only changes reviewed controls; PeopleSoft validates and saves through normal user flow | Real-system test needed |
| Delivered change hooks | Verify saved values after FieldChange/deferred processing, including AJAX replacement; do not infer success solely from changed DOM text | Real-system test needed |
| Search helpers | Advanced Search does not toggle closed on retry; Correct History honors delivered security and user setting | Real-system test needed |
| Trace | Validate distinct SQL cursor/fetch checkbox IDs, PC flags, save response, start/stop and partial denial; verify server trace stops | Real-system test needed |
| Trace SQL investigation | Accept one sanitized PeopleTools 8.62 `.tracesql`/`.trc` from a real capture; record Tools patch privately; only then change marker grammar | Not supplied — keep synthetic/unverified wording until a maintainer accepts a sanitized sample. Do not invent a “real” log |
| Host allowlist / inactive environment | No bar, keyboard action, Page Info snapshot, or delayed search mutation; side panel cannot navigate disabled hosts | Real-system test needed |
| Multi-tab / session | No storage churn; environment settings and favorites survive concurrent edits; sign-out/sign-in does not imply a verified trace state | Real-system test needed |
| Keyboard / screen reader | Tab and Shift+Tab stay in dialogs; Escape works after typing; focus returns; 200% zoom, contrast, forced colors, and live announcements | Real-system test needed |
| Agent reference entry points | Help opens public documentation without page/session context; local library filtering works with no external requests and no persisted search; popup/side-panel links and assistive technology remain usable | Real-system/AT check needed |
| Concurrent edits | Two Options tabs merge independent preferences; conflicting stale environment/favorite edits report a conflict and preserve saved data; recent visits do not cause write loops | Real-system test needed |
| Production awareness and runbooks | Explicitly classify the mapped environment; verify badge placement and per-action consent for Field Entry/trace start, cancellation on disable, normal unsaved-change protection and runbook label associations | Synthetic/browser checks passed; real-system/AT check needed |
| Environment comparison workspace | Explicitly review/save two snapshots; confirm portal/owning-target scope, dates, Tools/application metadata and incomplete-capture warnings; verify real iframe/modal ownership without treating UI equality as server equivalence | Synthetic/browser checks passed; real-system/AT check needed |
| Trace request evidence | Explicit On/Off requests; requested/acknowledged/unknown labels do not assert live state; disabling between GET and POST prevents the POST; observed login/logout invalidates confidence | Real-system test needed |
| Diagnostics and upgrade history | Review allowlisted diagnostics before copy/download; no automatic values/tokens/hostnames; choose dated/environment baselines and review handoff; dialog focus returns after toolbar rebuild | Real-system/AT check needed |

The browser cannot confirm App Designer definitions, PeopleCode scroll paths, security entitlements, or server-side customization correctness. Treat generated code and DOM metadata as aids for a developer to verify.

## Fluid collection save-warning report — 2026-10-20

The maintainer reported a save prompt while loading a Fluid side-menu collection; choosing No allowed navigation. Extension attribution has not been confirmed by an on/off comparison.

Version 1.0.32 removes broad More/Expand clicks, requires explicit search-page and control evidence, and limits each automatic action to once per target document. It skips selected/expanded controls and leaves unknown layouts for manual use. Synthetic browser tests cover collection-shell controls and same-origin target frames; they do not reproduce the actual application's dirty-state tracking.

Real-system acceptance remains open: on a fresh unchanged page, compare helpers off/on, open the affected collection and navigate between its pages, then repeat with a genuine unsaved edit. Unedited navigation should not acquire a save prompt from MPU; genuine unsaved changes must still receive PeopleSoft's normal protection. Record the Tools patch and outcome privately. Do not disable save warnings as a workaround.

References: [Oracle PeopleTools 8.62 Fluid guide](https://docs.oracle.com/cd/G35126_01/psft/pdf/pt862tflu-b062025.pdf), [Oracle 8.62 accessibility report](https://docs.oracle.com/en/corporate/accessibility/templates/t2-15706.html). Oracle's report covers its product, not this extension.

## Follow-up evidence — 2026-10-21

Live verification remains open. Browser automation denied creation of a Chrome dashboard tab and desktop control then stopped because it could not determine the current browser URL confidently. No Niagara on/off navigation comparison, live diagnostic, genuine unsaved-change test or new extension-on-public-page screenshot was performed; no Tools patch was established.

K/I implementation has passing synthetic regression and rendered-browser coverage for production consent/cancellation, current activation/scope/environment checks, owning-frame Field Entry hooks, intervening edits, retained dirty-marker state and trace stop availability. Runbook tests cover strict local imports and concurrent drafts. The full browser run passed 36 scenarios, including axe/contrast and narrow layouts; all five K/I scenarios passed again against the final rebuilt trace guard. Simulated hooks and a retained dirty marker do not establish delivered PeopleSoft validation or save-warning behavior. Repeat the real-system acceptance above, including genuine unsaved changes, when access permits.

The subsequent C workspace passed the full 39-scenario synthetic browser run, including reviewed snapshots, value/session-URL exclusion, unknown Classic target scope, disable-during-preview, retained history and concurrent conflicts. This adds no real-system result. The repeated Chrome dashboard access attempt was also blocked; no live Niagara observations or new screenshots were obtained.

The later native local-window attempt followed the user's instruction to avoid the Chrome MCP connector. Chrome accessibility reading succeeded on New Tab, with an MPU toolbar button present but no verified version. Screenshot capture timed out and both navigation attempts failed to activate the captured window; retries stopped. No enabled/disabled comparison, live diagnostic, unsaved-change test, patch identification or genuine extension-on-Niagara capture occurred. G's local file comparisons and synthetic parser samples do not add PeopleTools compatibility evidence.
