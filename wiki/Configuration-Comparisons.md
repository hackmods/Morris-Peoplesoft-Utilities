# Configuration comparisons

Open **Options → Compare configuration**. Select two sanitized UTF-8 files, choose the same format for both, then choose **Preview configuration comparison**. Review the complete report, including unmasked paths and values, and check the review box before copying or downloading it. Selection or format changes invalidate the report and export approval. **Clear configuration files and report** removes selections and preview; reload also starts empty.

Files are read only after Preview. Files, parsed values and reports stay in this tab's memory; they are not written to extension storage, included in settings backups or uploaded. The workspace does not connect to a server, resolve includes, expand variables, execute scripts or apply configuration. Clipboard contents and downloaded reports remain under your control after clearing.

## Supported formats, version 1

| Format | Accepted subset | Limits and uncertainty |
|---|---|---|
| INI-style | `[Section]` headings and `key=value`; unsectioned keys allowed; blank lines and whole-line `;` / `#` comments ignored | Section/key matching is case insensitive; duplicate sections or keys are rejected. Leading indentation/continuations are unsupported. Inline comments and quotes are literal value text. Whitespace after `=` is retained. Keys contain letters, digits, underscore, period or hyphen. |
| JSON object | A root object containing objects, arrays and scalar values; standard JSON syntax | Duplicate object keys are rejected, including escaped equivalents. Names are case sensitive; arrays use indexed JSON Pointer paths. Types, empty containers, blank strings and missing entries are distinct. No comments, trailing commas or executable expressions. |

Each input is limited to 256,000 UTF-8 bytes, 2,000 records (including INI section headings or JSON container entries), 16 path levels, 256 characters per path segment and 4,000 characters per scalar. JSON numbers retain their exact text: `1` and `1.0` are reported as different notation. Numbers that overflow JavaScript's finite range are rejected. Container rows compare types; child rows compare contents. A rendered report is limited to 1,000,000 UTF-8 bytes. Invalid or oversized inputs fail without a partial export. Source lines refer to the selected text, not server-side files. Ignored comments, formatting and order can matter to a different parser or runtime.

Oracle documents that `PSAPPSRV.CFG` groups application-server parameters into sections with an INI-like layout. This supports a small text-comparison format; it does not establish support for every Oracle configuration file or PSADMIN export. PSADMIN override lists, configuration templates, UBB/UBX/CFX/PSX files, scripts and logs are outside the supported formats. Reference: [PeopleTools 8.62 System and Server Administration, April 2025](https://docs.oracle.com/cd/G23955_01/psft/pdf/pt862tsvt-b042025.pdf), “Edit PSAPPSRV.CFG,” page 120, checked 2026-10-21. No delivered parameter names or defaults are inferred.

## Masking and interpretation

Sanitize files **before** selecting them. Conservative masking covers credential-like names and suspicious text such as credential assignments, PEM material and URLs carrying credentials or parameters. A sensitive entry on either side masks both sides before comparison. These rows are marked **not-compared**; matching masks never mean matching secrets. Sensitive paths are omitted. Reports contain neither source filenames nor secret hashes.

Masking cannot find every secret, proprietary path, hostname or business identifier. Review unmasked content before sharing. Reports distinguish added, removed, changed, type-changed and unchanged supported entries. String escaping protects report row boundaries. Matching text does not prove matching effective server configuration, domain settings, security, connectivity or PeopleTools patch compatibility.

Repository samples are synthetic acceptance fixtures, not real PeopleSoft exports. Real sanitized representative files and parser acceptance results are still needed before claiming compatibility with a particular export workflow.
