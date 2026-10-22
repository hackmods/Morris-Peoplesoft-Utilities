# Integration Broker investigations

Open **Options → Integration Broker**, or choose **Page Info → Investigate
sanitized IB samples** when the existing IB breadcrumb helper is available.
Page Info opens an empty workspace. No breadcrumb, active-page data or clipboard
contents are transferred automatically.

1. Use **Prepare evidence records without writing JSON** to enter observed context
   and paste a sanitized JSON/XML payload. An optional payload file is read only by
   **Read selected payload into form**. Select its format explicitly, then **Add
   evidence record to draft**. Add appends a validated record and retains form
   values; invalid additions preserve the draft. Remove records explicitly.
2. Alternatively select prepared JSON envelopes. Choose **Preview IB investigation**.
   At most four sources are supported, with a draft counting as Source 1 before
   the files. Draft JSON lines refer to generated text, not an external original.
3. Inspect metadata and supplied observation times. After Preview loads choices,
   open **Compare two explicitly selected records**, select two different records
   and preview again. **Case findings and follow-up** accepts a case label, owner,
   expected/observed results and per-check evidence notes/dispositions. These are
   manual assertions, not verified outcomes. Cite sources/records/lines in notes.
4. Payload details are omitted by default. To include them, select the payload
   option and prepare a new preview. Masking cannot detect every sensitive value.
5. Review all remaining business context and scope, check the review box, then
   explicitly copy or download the report. File/option edits invalidate approval.

## Supported envelope: mpu-ib-evidence / versions 1 and 2

This format is manually prepared evidence, **not a native monitor, gateway,
HTTP or log export parser**. Version 2 supports bounded inert XML/SOAP payload
excerpts without inferring IB metadata from SOAP headers. Synthetic fixtures provide regression
coverage only; representative real exports and PeopleTools patch behavior remain
unverified. The same example is available directly in Options.

```json
{
  "format": "mpu-ib-evidence",
  "version": 1,
  "records": [
    {
      "serviceOperation": "SYNTHETIC_OPERATION",
      "operationType": "asynchronous",
      "direction": "outbound",
      "senderNode": "SYNTHETIC_LOCAL",
      "receiverNode": "SYNTHETIC_REMOTE",
      "queue": "SYNTHETIC_QUEUE",
      "routing": "SYNTHETIC_ROUTING",
      "transactionId": "SYNTHETIC_TRANSACTION",
      "stage": "publication-contract",
      "reportedStatus": "Error",
      "error": "Sanitized example only",
      "payload": { "reference": "SANITIZED_SAMPLE" }
    }
  ]
}
```

The envelope contains exactly `format`, `version`, `records`. Records must be
nonempty objects using only the following properties. Every property is optional;
absence stays unknown, and a blank string stays blank. No field is inferred from
a filename, payload, adjacent record or matching identifier.

| Record property | Accepted value |
|---|---|
| `serviceOperation`, `senderNode`, `receiverNode`, `queue`, `routing`, `transactionId`, `reportedStatus` | String, up to 200 characters |
| `operationType` | `synchronous`, `asynchronous`, `unknown` |
| `direction` | `inbound`, `outbound`, `unknown` |
| `stage` | `operation`, `publication-contract`, `subscription-contract`, `gateway`, `unknown` |
| `error` | String, up to 4,000 characters |
| `payload` | JSON object or array, with bounded JSON scalar/container children |

Version 1 remains strict and unchanged. The form creates version 2 records, which
accept the properties above plus:

| Version 2 property | Accepted value |
|---|---|
| `environmentLabel`, `operationVersion`, `observedAt`, `correlationId`, `subQueue`, `errorLocation` | String, up to 200 characters |
| `evidenceNote` | String, up to 4,000 characters |
| `payloadRole` | `request`, `response`, `message`, `unknown` |
| `payloadVariant` | `original`, `transformed`, `unknown` |
| `payloadXml` | XML subset v1 string, up to 4,000 characters; mutually exclusive with `payload` |

Empty form metadata is omitted; imported blank strings stay blank. Draft JSON
numbers are not converted through a JavaScript object, preserving exact tokens.
`observedAt` contributes to the timeline only as a valid ISO date/time with an
explicit offset: `YYYY-MM-DDTHH:mm:ss[.sss]Z` or `±HH:MM`. Invalid/local/missing/
masked times remain unknown, with no inheritance, runtime or causal inference.
Comparable clocks are assumed, not verified.

## Explicit comparison and case findings

No pair is automatically selected or joined by IDs. File/draft changes clear
choices. A selected pair compares reported metadata with both source citations;
scope warnings cover missing/different/masked environment, operation/version/type,
direction and payload role/variant. Equal text does not prove correlation or delivery.

Payload comparison requires explicit inclusion and matching JSON/XML format. If
either selected payload contains **any masked entry**, the whole payload comparison
is withheld: no secret equality, hash, length or counterpart values are derived.
Otherwise types, exact numeric text, missing/blank distinctions and ordered
array/sibling positions are compared. XML uses lexical qualified names and
attribute/direct-text values, omitting namespace declarations/comments. Matching
text does not establish XML namespace, schema or business equivalence.

Case/owner fields are capped at 200 characters, expected/observed at 2,000 and
each checklist note at 1,000. Dispositions: `unreviewed`, `evidence-recorded`,
`needs-follow-up`, `not-applicable`. Sensitive manual text is masked for export;
assertions are never automatically verified. Every form, note, disposition, pair,
source or inclusion edit invalidates the report and approval. Only added records
enter reports; editing retained form values does not alter a previously added record.
Notes/dispositions are retained as typed after source changes. Recheck their
citations when files are changed or draft records are removed/renumbered; MPU does
not rewrite or verify those references.

## Inert XML/SOAP payload subset v1

Use version 2 `payloadXml`, or select XML in the form. XML 1.0 with an optional
UTF-8 declaration and ASCII qualified element names is supported. DTDs, custom/
external entities and processing instructions are rejected before DOM parsing.
Predefined/numeric character references, attributes, comments and CDATA are
supported within the subset; declaration/entity-like text may be conservatively
rejected even in comments/CDATA. Nodes are never inserted into a live document;
no namespace URI, XInclude or stylesheet is fetched.

Entries cite both the enclosing JSON value line and the decoded XML opening-tag
line (attributes/direct text use that tag's line). Repeated siblings have 1-based
occurrence paths. Sensitive names, decoded values and subtrees are masked before
evidence is returned. Namespace declarations are omitted rather than treated as
endpoint evidence. CDATA is text, never reparsed markup. Payload role and
original/transformed variant must be supplied manually.

These are MPU evidence labels, not a delivered Oracle export schema or status
mapping. Each file/record is reported separately with source number, one-based
JSON value line and JSON Pointer. Exact numeric tokens in payloads are preserved,
including large integers and decimal precision. Pointer keys escape `~` and `/`.
Matching IDs do not join records or prove cross-system identity. Reported statuses
at different stages do not establish end-to-end delivery, active routing, a queue
stall, permission correctness or root cause. The checklist is for manual evidence
review; it does not perform any operational action.

## Limits and privacy

- At most four sources including a draft, each 256,000 UTF-8 bytes and 50 records.
- At most 2,000 JSON entries per file, including envelope/container entries;
  16 nesting levels including the envelope; 256 characters per path segment;
  4,000 characters per payload scalar/error/evidence note or complete XML excerpt;
  metadata limit 200 characters. Expanded XML counts toward entry/depth budgets.
- At most 1,000,000 UTF-8 bytes per report. Invalid encoding/control text,
  malformed/duplicate keys (including escaped spellings), wrong versions/types,
  unknown envelope/record properties and overflows reject the entire preview.
  No partial report or raw parser error is exported. Report limits are checked
  during source/comparison assembly before oversized reports are allocated.

The parser reuses the configuration workspace's bounded JSON scanner, then
validates its own schema and limits. It never executes payloads, resolves external
entities or reparses ordinary JSON strings as XML, scripts or nested JSON. Only
the explicit XML field uses the inert subset above. Ordinary string values
containing markup/serialized JSON are conservatively masked. Sensitive key names,
subtrees and suspicious values are omitted before evidence is returned. This includes
common credentials, personal identifiers, connection/URL/email/path indicators;
masked path names and values are not exposed or compared. All remaining metadata,
payload keys and values still need review. Sanitize first; masking can over-mask
legitimate evidence and cannot establish that content is safe to share.

Selection alone reads nothing. Preview reads envelope files; a separate payload
button reads a selected form payload. Files, drafts, form/case notes, parsed
records and reports stay in tab memory: no workspace storage key,
settings backup entry, network call, server access, authentication, replay,
resubmit/cancel or routing/queue/node changes. Clear/page exit/reload resets files,
payload inclusion, draft/form/case notes, pair choices and report; switching Options
sections preserves unfinished work. Add retains form values and never overwrites files.
Stale file reads cannot restore an invalidated report. Downloads and clipboard
contents remain under your control after clearing or uninstalling. Selected filenames
are omitted from reports; source-file numbers follow selection order.

## Evidence references

Remaining validation: obtain authorized sanitized samples of synchronous request/
response, asynchronous operation/publication/subscription, gateway faults and
original/transformed XML, with provenance and expected source lines. Validate each
named format separately and record actual Tools patch/browser/assistive-technology
outcomes. Larger XML, arbitrary gateway/HTTP logs and native export adapters need
separate sample-backed parser work; they are not silently accepted here.

[Synthetic samples and acceptance cases](../tests/fixtures/ib-investigation/README.md)
cover the shared parser/UI and both installed browser extensions. Automated axe,
contrast and keyboard checks do not establish AODA/WCAG or assistive-technology
conformance. Real-system validation remains separate.

Consulted 2026-10-21: [Oracle PeopleTools 8.62 Service Operations Monitor](https://docs.oracle.com/cd/G41076_01/psft/pdf/pt862tibm-b112025.pdf)
and [Integration Broker Administration](https://docs.oracle.com/cd/G41076_01/psft/pdf/pt862tiba-b112025.pdf).
The monitor distinguishes operation and publication/subscription contract evidence;
the manuals inform the checklist, not the custom file format. No delivered IDs,
roles, payloads or status-code mappings are invented by the workspace.
