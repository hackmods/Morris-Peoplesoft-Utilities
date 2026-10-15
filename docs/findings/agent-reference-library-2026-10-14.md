# Agent reference library — implementation and verification

Implemented Options → Agents with local search/task filtering across 22 public prompt references and three private pillar template links. Popup/side-panel entry points open the local library; existing Help links to the public toolkit. Generated metadata contains only IDs, titles, descriptions, kinds and public source paths; full prompts and skills stay in the separate toolkit.

No new manifest permissions or CSP changes. No remote fetch/AI execution, automatic page export or persisted search. Public documentation links use noopener/noreferrer and no-referrer without PeopleSoft context/query parameters. Privacy and listing copy distinguish these references from independent use of an AI provider.

Policy reasoning is recorded in [ADR 0009](../adr/0009-agent-reference-library.md), based on Chrome's single-purpose, minimum-functionality and MV3 requirements. This is an interpretation for the implemented reference feature, not a guarantee of Chrome Web Store acceptance. New source links become available when the corresponding repository changes are published; release downloads reflect the published release.

## Verification

- `npm run lint`, build and 246 unit/integration/smoke tests passed.
- `npm run release:check` passed: 249 tests across 27 files; coverage thresholds unchanged; accessibility/compliance/store audits and both packages passed. Existing store audit warnings still identify two generated screenshot placeholders; no store artwork was altered by this feature.
- `npm run test:e2e` passed all 20 Chromium extension tests, including local filtering with zero external requests/storage changes, deep-link entry points, Help focus return, light/dark rendered axe checks with contrast and 320 px reflow.
- Extension ZIP: 59 entries, original permissions/CSP, no AGENT.md/SKILL.md files or agents directory; integrity passed. Separate prompt ZIP: 132 entries with current README and intact toolkit.
- A local rendered preview was captured under ignored test-results; it is extension UI, not a real PeopleSoft screenshot.

No commit, push, Store submission, global host installation or real PeopleTools/assistive-technology validation was performed in this task. The existing real-system matrix remains in [PeopleTools 8.62 testing](../testing/peopletools-8.62.md).
