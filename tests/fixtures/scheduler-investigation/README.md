# Scheduler investigation sample provenance and acceptance scope

These files were authored as synthetic, sanitized parser fixtures on 2026-10-21.
They contain invented instance numbers and messages. They are not Oracle log
exports and do not demonstrate native PSPRCSRV, Application Engine, SQR,
distribution-log or PeopleTools patch compatibility. The user authorized
synthetic samples for this increment; representative sanitized logs remain needed.

Named parser: **ISO-labelled scheduler excerpts v1**. It accepts bounded UTF-8
plain text and preserves one-based physical source lines. Blank lines count
toward limits but do not become report rows. Only a strict ISO date/time at column
one with an explicit offset provides timeline evidence. Only standalone,
semicolon-delimited `Process Instance: N` and `Parent Process Instance: N` labels
provide instance/parent evidence (1–15 digits, positive, no leading zero).
No inherited timestamp, ID, status or job order is inferred. Arbitrary text is
retained as unsupported evidence, subject to conservative masking.

Acceptance cases covered in unit and installed-extension browser tests:

- Stable ordering across offsets and equal times; invalid calendar dates,
  local/partial dates and unsupported prefixes retain unknown time.
- CR/LF/CRLF, blank lines, duplicate observations and source line provenance.
- Explicit parent labels, conflicting parents, missing/self/duplicate/invalid
  labels; matching IDs alone cannot establish cross-source identity.
- Sensitive lines, timestamp-delimited continuations and private-key blocks
  masked before structural extraction. No raw filename or parser error echo.
- Invalid UTF-8/control text, all file/line/ticket/report limits fail without
  partial export. Explicit preview, fresh review after every input change,
  cancellation of stale reads, clear/reload, keyboard and rendered axe/contrast.

Reference consulted: [Oracle PeopleTools 8.62 Process Scheduler](https://docs.oracle.com/cd/G41076_01/psft/pdf/pt862tprs-b112025.pdf),
chapter 16, checked 2026-10-21. Oracle describes multiple log sources and
language/configuration-dependent logging. This informs the evidence boundaries,
not the synthetic grammar. No Oracle example messages or delivered IDs were copied.
