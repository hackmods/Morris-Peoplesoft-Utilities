# Trace SQL investigations

Open **Options → Trace SQL**. Select one sanitized `.tracesql` / `.trc` excerpt,
preview the report, review it, then copy or download. Files stay in the Options
tab memory only — nothing is written to extension storage or sent over the network.

## Partial port

This is a **partial** replacement for the legacy Oracle Trace Magic desktop tool.
MPU today covers core marker parsing and a text hotspot report. Not yet in the
extension: Trace Magic–compatible SQL IDs, plan trees with source jump, duration
charts, interactive SQL-by-FROM / SQL-by-WHERE grouping, multi-file compare, E2E
Options smoke coverage, and verified real PeopleTools samples. Recovery notes and
the full remaining backlog live in the sibling RETM vault
(`../RETM/docs/remaining-parity.md`).

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
