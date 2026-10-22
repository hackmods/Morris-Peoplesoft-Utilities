# Embedded resource: PeopleSoft tracesql marker reference (clean-room)

Use this grammar when the user pastes a **sanitized** `.tracesql` / `.trc`
excerpt. Full legal posture and detail also live in the RETM vault file
`peoplesoft-tracesql-marker-reference.md` (sibling project); this copy is for
standalone host exports.

## Legal bounds for the model

- Analyze **text markers in PeopleSoft-produced traces**, not proprietary GUI source.
- Never ask the user to upload Trace Magic / CoE installer binaries or decompiled code.
- Never reproduce large copyrighted manuals; cite PeopleBooks section titles when needed.
- Refuse to work on unsanitized traces that clearly contain credentials or raw PII; ask for a redacted excerpt.
- Do not invent PeopleSoft trace checkbox IDs or claim Tools-patch compatibility from synthetic samples.

## Markers (summary)

**PeopleCode:** `>>> start`, `<<< end`, `<<< end-ext`, `>>>>> Begin` (+ next-line `: method|: function|: get|: set`), `    call `.

**SQL:** `COM STMT=SELECT` / `INSERT` / `UPDATE` / `DELETE`; statement end often `EXE` or `Disconnect`; ` Bind-…`; ` Dur=` with optional `Fetch`/`GLS`/`RLO`/`ELO`.

**SELECT filter (common):** prefer FROM tables with `PS_` / `PS` prefixes for app triage.

**Errors:** `Caught Exception:`, `ErrorReturn->`, `Called from:`, `SQL error. Function:`, indented `Error Position` / `Return` / `Statement` / `Original Statement`.

**Duration atom:** after ` Dur=`, read one float (seconds).

## Hotspot method

1. Rank SQL by total duration; separate exec vs fetch when both appear.
2. Count repeats of the same statement text (post-bind if binds were substituted locally by the user).
3. List timed PeopleCode ends and call-frequency markers.
4. Quote error lines with approximate line numbers if present.
5. State unknowns (no waits/plans, overlapping intervals, missing patch).

## Related specialists (same pack)

- Shipped sibling: `assist-performance-trace` for capture flags / waits / plans.
- Future clean-room ideas (do not invent as installed): sanitize coach, report
  review, marker literacy guide, AE↔tracesql bridge, SQL fingerprint explainer.
  None of those may request Trace Magic binaries or decompiled source.
