# Trace SQL investigations

Open **Options → Trace SQL** (linked from **Options → Tracing** after you capture
a trace). Select one sanitized `.tracesql` / `.trc` file **or** paste sanitized
text, preview the report, review it, then copy or download. Evidence stays in the
Options tab memory only — nothing is written to extension storage or sent over
the network.

## Partial port

This is a **partial** replacement for the legacy Oracle Trace Magic desktop tool.
MPU today covers core marker parsing plus a text hotspot report with Trace Magic
SQL IDs, SQL-by-FROM / SQL-by-WHERE aggregates, a nested plan-tree section, and
accessible duration bars. Still outstanding versus the desktop tool: interactive
ListView-style grouping UI, clickable source jump, rich charts, multi-file
compare, and verified real PeopleTools samples. Recovery notes and the remaining
backlog live in the sibling RETM vault (`../RETM/docs/remaining-parity.md`).

## Supported parser: PeopleSoft tracesql markers v1

This parser is a **clean reimplementation** of marker rules observed in the
legacy Oracle Trace Magic desktop tool (RETM). It is **not** a redistribution of
Trace Magic source. Coverage is synthetic; real PeopleTools patch compatibility
is unverified.

Recognized markers:

- PeopleCode: `>>> start`, `<<< end`, `<<< end-ext`, `>>>>> Begin`, `    call `
- SQL: `COM STMT=SELECT` / `INSERT` / `UPDATE` / `DELETE` (case-insensitive after uppercasing)
- Timing: ` Dur=` float atoms; fetch labels `Fetch`, `GLS`, `RLO`, `ELO`
- Binds: ` Bind-N … value=…` (types `18` / `19` stay unquoted when substituted)
- Errors: `Caught Exception:`, `ErrorReturn->`, `Called from:`, `SQL error. Function:`, and indented `Error Position` / `Return` / `Statement` / `Original Statement` lines

`SELECT` statements whose FROM clause never mentions a `PS_` / `PS` table token
are ignored (legacy Trace Magic filter).

## Limits and privacy

One file: at most 2,000,000 UTF-8 bytes, 50,000 physical lines and 16,000
characters per line. Unsupported encoding or control characters fail the preview;
no partial report remains exportable. Sanitize binds and PII before selection.
Report cells use JSON string escaping. Filenames are omitted.

## Evidence

[Synthetic fixtures](../tests/fixtures/tracesql-investigation/README.md) cover unit
tests only. Validate representative traces from your environment before relying
on hotspot rankings operationally.
