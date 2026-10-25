# Synthetic sample requests

Use one prompt/skill and attach only the artifacts it needs. Examples establish request shape, not delivered schema facts.

| Task | Prompt | Sample request |
|---|---|---|
| BA design | design-functional-requirements | Define a temporary-assignment request with eligibility, overlap and approval rules; policy is attached. |
| SQL review | review-data-correctness | Review this all-history extract; it intentionally returns every prior effective row. Expected counts attached. |
| PeopleCode | assist-peoplecode | Draft a reusable date-overlap rule for supplied SaveEdit and AE callers; signatures and types attached. |
| CI triage | assist-integrations | Property assignment logged an edit error but Save succeeded; inspect sanitized PSMessages and CI settings. |
| AE | assist-application-engine | Identify recovery after commit 2; step/state map and synthetic business totals attached. |
| Scheduler | assist-process-scheduler | Execution succeeded, distribution failed; identify next read-only checks without rerunning business work. |
| Performance | assist-performance-trace | Rank cost from supplied timings/call counts; units and comparable baseline attached. |
| Fluid | assist-fluid | Diagnose clipping on Classic content inside a Fluid navigation collection; owning frame and layout supplied. |
| Accessibility | review-fluid-accessibility | Review modal focus after typed input/cancel/error; rendered evidence and keyboard results attached. |
| Upgrade | review-upgrade-migration | Assess these compare differences and missing configuration dependencies; target release and inventory supplied. |
| Local skill | guide-specialist-trainer | Build a private CS enrollment specialist using current definitions and owner policy; mark missing facts unknown. |

See [evaluation cases](../evaluations/cases.json) for expected behavior and false-positive boundaries. A request does not authorize changing a live system.
