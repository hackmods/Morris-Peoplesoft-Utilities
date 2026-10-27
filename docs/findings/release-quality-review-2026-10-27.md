# Recent work quality review — 2026-10-27

The maintainer reported that recent work felt rough and patchy. This pass reviews
the PDF expansion, reference preferences, Trace SQL preview/report path and the
recent Scheduler/IB/runbook consolidation evidence before landing PR #44.
It is not real PeopleTools or assistive-technology sign-off.

## Root findings and repairs

1. **Trace SQL repeated parsing after its cancellable pass.** The UI parsed one
   or two excerpts asynchronously, then called the text renderer, which parsed
   them synchronously again (and again for full comparison sections). The report
   now consumes the already validated parse results. The synchronous public
   entry points use that same renderer and parse each excerpt once. Report
   assembly/rendering remain bounded synchronous operations; this does not claim
   that every browser rendering step is cancellable.
2. **Preference completion could undo a later view update.** PDF and Agents
   callbacks unconditionally replaced local state after a save, even if a newer
   storage event had already arrived. Delayed-save regressions reproduced this
   in both libraries. Completion now respects observed storage revisions. An
   additional failing-before regression showed that an initial Agents preference
   read could overwrite a completed local save; that late read is now ignored.
   Favorite buttons stay focusable and duplicate clicks remain blocked across
   rerenders. These are UI-state repairs, not a change to storage schema.
3. **One PDF test never exercised the topic filter.** It selected the first
   select (application family), assigned an invalid topic value, and asserted a
   result that already matched. It now selects Topic and verifies both inclusion
   and exclusion. Aggregate passing tests did not establish that interaction.
4. **Maintenance and empty-state rough edges.** The catalog refresher stamped
   a fixed date regardless of when it ran; it now records the refresh date.
   Empty favorites/recent lists now explain how to populate them, and filtered
   empty results explain how to recover. Removed unused historical URL-building
   data so the checked snapshot is the sole PDF URL source.

The three behavioral regressions (PDF stale completion, Agents stale completion
and Trace SQL reparsing) failed before the repairs and passed afterward. Report
parity covers both one and two excerpts, including invalid source counts.

## Call sites and sibling decisions

| Pattern / surface | Relationship | Decision |
| --- | --- | --- |
| Trace SQL UI → async parser → report renderer | Same defect | SHIP reuse parsed reports |
| Synchronous single/comparison Trace SQL renderers | Same parser duplication | SHIP share parsed rendering; output parity regression |
| PDF favorite and recent completion, initial load, storage listener | Same stale-state family | SHIP per-key revision guard and preserve initial-load protection |
| Agents favorite/use/dismiss/clear-recents completion | Same stale-state family | SHIP one local completion guard; retain worker serialization |
| Options and side panel PDF/Agents bindings | Shared production code | Verify both through browser journeys; no duplicate browser implementation |
| Scheduler/IB case edits, preview invalidation, Clear and page exit | Adjacent lifecycle | SKIP rewrite: existing generation guards and prior regression coverage retained |
| Runbooks and configuration/environment comparisons | Adjacent stored/draft workflows | SKIP rewrite: existing revision/draft protections retained; no new reproduced defect in this bounded pass |
| Store artifact checkpoints | Adjacent release integrity | SHIP mark frozen 1.0.35 candidates superseded; source is now 1.0.36 |

The design decision is to repair shared local state/rendering patterns. A generic
framework across all feature modules would add scope without fixing a further
demonstrated failure and is deferred.

## Remaining work and limits

| Item | Verdict | Why |
| --- | --- | --- |
| Representative Scheduler/IB/configuration exports and expected outcomes | HUMAN | Current named parsers and custom envelopes have synthetic coverage. Do not claim general native-log/export support. |
| Actual PeopleTools 8.62, Fluid save-warning and assistive technology checks | HUMAN | Still open in the real-system test matrix; automated axe and browser parity do not replace them. |
| Long explanatory copy and dense investigation workspaces | DEFER | A product-usability pass is justified, using representative user tasks; wholesale UI changes are not needed to repair the demonstrated races/parsing defect. |
| Arbitrary older application PUM catalogs or new native parsers | DEFER | Only published, explicitly labelled catalog snapshots and named formats are supported; do not invent retired links or grammars. |
| Chrome and updated Firefox publication | Outstanding | Firefox 1.0.34 is the last verified listing. Later frozen candidates have not been submitted. Release access is separate from source verification. |

No new feature module, permission, telemetry, automatic capture, persistent draft
or remote service is introduced. PR #44 remains the existing review location.
