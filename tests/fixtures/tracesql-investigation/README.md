# Trace SQL investigation fixtures

Synthetic PeopleSoft tracesql markers for `PeopleSoft tracesql markers v1`.

These lines are **not** captured from a real PeopleTools system. They exercise
COM STMT / Dur= / Bind- / PeopleCode start-end / error markers only. Real-log and
patch compatibility remain unverified. Values use `REDACTED*` placeholders —
sanitize real logs before paste.

Lawsuit-safe marker grammar: sibling RETM
`docs/peoplesoft-tracesql-marker-reference.md`.

## Files

| File | What it demonstrates |
| --- | --- |
| `sample.tracesql` | Core unit/E2E fixture: SELECT/INSERT/UPDATE/DELETE, binds (incl. type 18), DUAL ignore, PeopleCode end, errors |
| `example-volume-vs-slow.tracesql` | Many cheap repeated SELECTs vs one slow `PS_JOB` SELECT (volume vs single hotspot) |
| `example-peoplecode-nesting.tracesql` | `>>> start`, `>>>>> Begin` + `: method`, `call` kinds, `<<< end-ext` |
| `example-multiline-select.tracesql` | `COM STMT= SELECT` spanning lines until `FROM`; Fetch/GLS; non-`PS` DUAL ignored |
| `example-sql-errors.tracesql` | `Caught Exception`, `ErrorReturn->`, `Called from:`, `SQL error. Function:`, indented Error Position/Return/Statement |
| `example-mixed-session.tracesql` | Combined session: Begin/function, DML + SELECT, type 18/19 binds, end-ext, warning exception |

## Try in Options

Options → Trace SQL → choose one file (or paste) → Preview. Then Options → Agents
→ search `tracesql` for `assist-tracesql-hotspots` with the **reviewed** report only.
