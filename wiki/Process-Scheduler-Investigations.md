# Process Scheduler investigations

Open **Options → Process Scheduler**, or use **Page Info → Investigate sanitized
Scheduler logs** on a detected Process Monitor page. An ambiguous grid disables
ticket-pack copying; select one process row or open its details and reopen Page Info.
The button opens an empty workspace. Copy/paste any ticket evidence explicitly;
MPU never attaches page data automatically.

1. Sanitize your excerpts locally and select one to four UTF-8 text files.
2. Optionally paste a sanitized Process Monitor ticket pack (4,000 characters).
3. Select **Preview Scheduler investigation**. Selection alone does not read files.
4. Optionally expand **Case scope, findings and follow-up (manual)**. Record the
   environment/capture window, expected/observed result, owner, findings and next
   steps. Keep run and distribution observations separate; MPU verifies neither.
   Evidence references use exact comma-separated `Source N:Lm` citations and must
   identify existing nonblank records. A masked record can be cited without exposing it.
5. After Preview loads the choices, optionally choose a **Process focus**, then
   preview again. A choice refers only to explicit labels in one selected source;
   repeated instance numbers do not prove the same environment/run. The full source
   report remains available. A conflicting manually supplied instance is flagged.
6. Review the full report, including unknown evidence, sensitive context and scope.
7. Check the review box, then explicitly copy or download the report.

The report includes original source lines, an offset-timestamp timeline, explicit
parent-label evidence and manual follow-up checks. Source numbers follow file
selection order; selected filenames are omitted. Retain your original files locally
to resolve the citations. Reports are observations, not verified execution histories.

## Supported parser: ISO-labelled scheduler excerpts v1

This initial parser has synthetic sample coverage only. It is **not a native
PSPRCSRV, AE, SQR or distribution-log parser** and has no real-system compatibility
claim. Native-format support needs representative sanitized samples and a separately
named, tested grammar. You can still review unsupported text with unknown metadata.

Recognized timestamps start in column one, followed by whitespace or the line end:
`YYYY-MM-DDTHH:mm:ss`, optional 1–3 decimal milliseconds, then `Z` or `±HH:MM`.
Calendar/time parts must be valid. Localized dates, brackets, missing offsets and
continuations do not inherit timestamps. Timeline ordering assumes comparable
clocks; it computes no runtime or queue durations.

Only exact semicolon-delimited `Process Instance: N` and
`Parent Process Instance: N` labels are extracted. N must be a positive 1–15 digit
number without leading zeroes. A parent requires one unambiguous child label on
the same line. Duplicate, invalid and self-parent labels do not yield relationships.
Conflicting parents retain every cited claim and a conflict warning. No dependency,
job membership, root cause, process/distribution status or cross-environment identity
is inferred from matching IDs, adjacent records or words such as “Success”.

## Limits, privacy and lifetime

Each file: at most 256,000 UTF-8 bytes, 2,000 physical lines including blanks and
4,000 characters per line. At most four files and a 1,000,000-byte report.
Unsupported encoding, control characters, empty excerpts or overflows fail the
entire preview; no partial report remains exportable. Blank source lines count
toward limits and source numbering but are omitted from the report rows. Report
cells use string escaping, and are rendered as plain text.

Conservative masking omits entire sensitive records (including common credential,
user/run-control, connection, URL, email and path indicators) before extracting IDs
or timestamps. Following records remain masked until the next supported timestamp;
private-key blocks remain masked through their end. This can over-mask legitimate
evidence and cannot detect every secret or business identifier. Sanitize sources
first and inspect all unmasked content before sharing. Selected filenames and raw
parser errors are omitted, but text inside your sources still needs review.

Files, ticket text and reports stay in the Options tab's memory. There is no
workspace storage key, settings export entry, network request or server action.
Every input change invalidates the report and approval; stale file reads are
discarded. Clear, page exit or reload resets the workspace. Your downloaded files
and clipboard remain under your control. Switching Options sections preserves the
unfinished workspace until you clear it or leave the page.

Case fields and focus are also session-only. Metadata fields allow 200 characters,
narrative fields 2,000, and references 500. Manual assertions are clearly labelled,
quoted and conservatively masked. Changing source selections clears focus choices
and invalidates review, while retaining typed findings/references: recheck their
meaning against the new source numbers. Invalid references/controls or case limits
reject the entire preview. Clear/page exit/reload removes all case work. Report
size is checked during assembly.

## Evidence and follow-up

[Synthetic fixtures and acceptance cases](../tests/fixtures/scheduler-investigation/README.md)
cover Chrome and the installed Firefox extension. Automated accessibility checks
do not establish AODA/WCAG conformance or assistive-technology compatibility.

Reference: [Oracle PeopleTools 8.62 Process Scheduler, chapter 16](https://docs.oracle.com/cd/G41076_01/psft/pdf/pt862tprs-b112025.pdf),
checked 2026-10-21. Its logging overview informs the evidence boundaries; this
parser does not reproduce Oracle's native format. Validate representative logs,
real Process Monitor ticket evidence and actual Tools patch behavior before relying
on derived metadata in an operational investigation.
