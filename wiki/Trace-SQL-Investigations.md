# Trace SQL investigations

Open **Options → Trace SQL** (linked from **Options → Tracing** after you capture
a trace). Select one or two sanitized `.tracesql` / `.trc` files **or** paste sanitized
text, preview the report, review it, then copy or download. Two files add SQLID and
FROM compare sections. Filter FROM/WHERE by SQLID and open a plan row to highlight
the matching source line. Evidence stays in the
Options tab memory only — nothing is written to extension storage or sent over
the network.

## Partial port

MPU Options → Trace SQL is a **clean-room** hotspot preview for PeopleSoft
`.tracesql` / `.trc` text. It covers core marker parsing plus a text report with
independent SQL fingerprints, SQL-by-FROM / SQL-by-WHERE aggregates, a nested
plan-tree section, and accessible duration bars. Still outstanding versus fuller
desktop analyzers: interactive grouping UI, clickable source jump, rich charts,
multi-file compare, and verified real PeopleTools samples. Remaining backlog:
sibling RETM vault (`../RETM/docs/remaining-parity.md`). Lawsuit-safe marker
grammar + agent ideas: `../RETM/docs/peoplesoft-tracesql-marker-reference.md`.

## Supported parser: PeopleSoft tracesql markers v1

This parser is a **clean reimplementation** of markers that appear in
**PeopleSoft-produced** trace text. It is **not** a redistribution of any
third-party Trace Magic / CoE desktop product, binaries, or decompiled source.
Coverage is synthetic; real PeopleTools patch compatibility is unverified.

## AI agents (sanitized pastes only)

- After copy/download, open **Options → Agents** and search `tracesql` for
  `assist-tracesql-hotspots` (sanitized report text only; refuses proprietary binaries).
- Related: `assist-tracesql-sanitize`, `guide-tracesql-literacy`,
  `review-tracesql-report`, `assist-sqlid-fingerprint`, `assist-tracesql-ae-bridge`.
- Sibling: `assist-performance-trace` — capture design / waits / plans.
- Do not upload Trace Magic installers or unsanitized production dumps to AI hosts.

Recognized markers:

- PeopleCode: `>>> start`, `<<< end`, `<<< end-ext`, `>>>>> Begin`, `    call `
- SQL: `COM STMT=SELECT` / `INSERT` / `UPDATE` / `DELETE` (case-insensitive after uppercasing)
- Timing: ` Dur=` float atoms; fetch labels `Fetch`, `GLS`, `RLO`, `ELO`
- Binds: ` Bind-N … value=…` (types `18` / `19` stay unquoted when substituted)
- Errors: `Caught Exception:`, `ErrorReturn->`, `Called from:`, `SQL error. Function:`, and indented `Error Position` / `Return` / `Statement` / `Original Statement` lines

`SELECT` statements whose FROM clause never mentions a `PS_` / `PS` table token
are ignored (legacy Trace Magic filter).

## Limits and privacy

At most two files (or one paste): each at most 2,000,000 UTF-8 bytes, 50,000
physical lines and 16,000 characters per line. Unsupported encoding or control
characters fail the preview; no partial report remains exportable. Sanitize binds
and PII before selection. Report cells use JSON string escaping. Filenames are
omitted.

## Evidence

[Synthetic fixtures](../tests/fixtures/tracesql-investigation/README.md) cover unit
tests and doc-based examples (`example-*.tracesql`: volume vs slow, PeopleCode
nesting, multi-line SELECT, SQL errors, mixed session). Validate representative
traces from your environment before relying on hotspot rankings operationally.
