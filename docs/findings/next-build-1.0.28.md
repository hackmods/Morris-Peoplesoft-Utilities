# Next local build: 1.0.28

Recorded 2026-10-14. Local working-tree results; no push, Store submission or independent real-system certification is asserted.

## Included

- Black/charcoal and orange identity across injected tools, options, popup, side panel, PS icons and promo tiles. [Palette and icon provenance](../branding.md) records the UnionOps reference and built-in imagegen recolour. Previous icon sources and existing listing screenshots are retained.
- Agent library references 22 portable prompts and three private pillar-specialist templates. Role-aware search and a blank editable task-brief builder help users choose and invoke a prompt in their approved AI tool. No page context is captured; explicit clipboard copy has a keyboard fallback. Briefs are not persisted.
- Builds validate canonical prompts, generated host exports and the extension reference catalog before compilation, preventing stale exports from shipping.
- Agent pack 4.0.1 includes 32 evaluation cases and an empty per-host/model results worksheet. All model trial statuses remain `not-run`.

## Local verification

- `npm run release:check`: passed, including lint/typecheck, 251 coverage tests, accessibility smoke checks, Store/compliance audits and both packages. Coverage gates were not changed.
- `npm run test:e2e`: 20 passed on synthetic fixtures, including rendered axe with contrast, keyboard/focus, narrow layouts, Classic/Fluid frames, local agent discovery and clipboard fallback.
- After the final brief caret/scroll adjustment, the Agents library browser test passed again, including the added start-position assertion and rendered light/dark/narrow checks.
- All 22 exported skills passed the skill-creator metadata validator. This checks structure, not model performance.
- Extension permissions remain `storage`, `sidePanel`, and `tabs`. The extension contains public agent-reference metadata; full prompts/skills ship in the separate prompt ZIP.

## Further enhancements and evidence

The next priority is validation of the existing coverage. No additional agent type is required for the requested scope before these checks:

1. Record real PeopleTools 8.62 patch-specific Classic, Fluid, modal/frame, trace and host-scope behavior in the [compatibility matrix](../testing/peopletools-8.62.md), with keyboard and assistive-technology results. Synthetic tests do not establish compatibility or accessibility conformance.
2. Run the prompt evaluation cases in the actual Copilot, Claude and Codex configurations being adopted. Record host/model/date, reviewed answers and failures privately; keep the distributed worksheet blank.
3. Tailor the HCM, FSCM and Campus Solutions templates privately with verified local definitions before treating them as site specialists.
4. Replace the two known mock Store screenshots (`02-favorites.png` and `03-page-info.png`) and refresh genuine reviewed captures for the new palette. The audit still reports these warnings; local UI previews are not live PeopleSoft captures.

See [release readiness](../release-readiness.md) for submission evidence still outstanding.
