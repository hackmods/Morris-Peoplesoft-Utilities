# Investigation acceptance — representative files and live pages

Use this checklist with an approved tester. Keep original/sanitized captures,
employer-specific metadata, screenshots and expected-outcome notes outside the
public repository. Record the exact extension build, browser/version, Tools patch,
application release/PUM, date, UI scope and settings. A Fluid page alone does not
identify a Tools patch.

## Evidence required before calling a workflow validated

| Workflow | Representative input | Independent expected result |
| --- | --- | --- |
| Scheduler | Authorized sanitized run and distribution excerpts, with original formatting/line breaks preserved; source scope and capture window recorded separately | Manually annotate physical source lines, explicit instance/parent labels, unknown/unsupported native lines, conflicts and masking. Never assume that matching IDs join files or that nearby timestamps imply execution/dependency order. |
| IB | Authorized sanitized monitor/gateway observations or payload artifacts kept as original evidence; separately identify any manually prepared `mpu-ib-evidence` envelope/form record | Manually record operation/stage, reported status, source references, omitted versus included payload and uncertain transaction identity. Native artifacts are not magically converted into supported JSON; unsupported uploads must fail without stale export. |
| Configuration | Approved sanitized before/after INI-style or JSON files in their original grammar | Independently list added, removed, changed and deliberately withheld secret paths. Confirm duplicate-key rejection and unchanged files. A comparison of text does not establish effective server configuration. |

For each source, record an opaque case ID, provenance (real capture / public
documentation example / synthetic), sanitization owner/date, original format,
any transformations, source hash and expected findings. Sanitization must not
rewrite native syntax into MPU's supported format and then be reported as native
compatibility. Obtain approval before a real capture becomes a public fixture.

## Repeat each task in Chrome and actual Firefox

1. Open the intended empty Options workspace. Verify visible scope/privacy
   guidance, source controls and disabled export. Selection alone reads nothing.
2. Choose approved inputs and their actual supported format. Preview, then compare
   the report against the independent expected findings and physical citations.
3. Open optional guidance, manual case context and evidence detail by keyboard.
   Confirm that closing a disclosure retains typed values and that source-line
   navigation and dialog Escape/focus return remain usable where applicable.
4. Review and export. Compare the downloaded text with the reviewed report, then
   check it manually for unmasked sensitive information and unjustified claims.
5. Change a source, format, payload option or case finding. Export must become
   unavailable until a fresh preview and review. Repeat with invalid encoding,
   unsupported native input and cancelled/stale reads; no previous report may
   remain exportable.
6. Clear, switch away/back, reload, and revisit in a new tab. Clear/reload removes
   investigation evidence. Ordinary section switching retains the unfinished
   session draft. Nothing enters extension storage or external requests.
7. Repeat at narrow width and 200% zoom. Test keyboard and assistive technology
   separately from automated axe. Record observed failures with reproduction
   steps rather than replacing them with passing synthetic results.

## What the public examples can establish

The career-page registry supplies real public PeopleSoft pages for read-only
layout/navigation and extension entry-point observations. It does not grant
administrative access or provide Scheduler logs, IB artifacts or configuration
files. Do not invoke admin/setup shortcuts, tracing, Field Entry Apply, job
applications, message replay or server configuration changes during these checks.

On 2026-10-27, Niagara loaded in connected Chrome with an MPU toolbar. The
installed build and Tools patch were not established, and Help timed out before
dispatch. Site-access/foreground handoff remains pending. Therefore the three
representative-file rows above are **not performed**, not passed. Record later
results in [the real-system matrix](peopletools-8.62.md), with source build and
provenance, before changing that status.
