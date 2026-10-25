# IB investigation fixture provenance and acceptance

Authored 2026-10-21 as synthetic samples for the roadmap's initial F increment.
All operation/node/queue/routing/transaction names, statuses and messages are
invented. `operation.json` and `contract.json` are manually prepared **mpu-ib-evidence / version 1** JSON
envelopes, not native PeopleSoft, gateway, SOAP or HTTP exports. They establish
regression coverage only. Representative sanitized real exports remain needed.

Envelope properties are exactly `format`, `version`, `records`; record properties
are whitelisted in the [supported scope](../../../wiki/Integration-Broker-Investigations.md).
Version 1 payloads are JSON objects/arrays, never executed or reparsed as XML/scripts.
The two samples illustrate reported statuses at separate stages, without
asserting cross-source identity or inferring delivery from an operation status.

Acceptance scope:

- Strict version/schema, duplicate keys including escaped spellings, malformed
  JSON/UTF-8, unknown properties, wrong types and all resource bounds fail closed.
- Preserve source-file number, one-based JSON value line and JSON Pointer,
  including escaped keys and exact numeric tokens; retain absent versus blank.
- Metadata is reported evidence; stages remain distinct. No automatic joins,
  status/code interpretation, network calls, replay or server changes.
- Omit payload detail by default. On explicit inclusion, mask sensitive names,
  values and descendant paths before reporting; omit secret key names/values,
  endpoints, personal identifiers and serialized markup/JSON from derived data.
- Selection alone reads nothing. Fresh Preview and review required after every
  file/payload-option change; stale reads, clear/reload, clipboard fallback,
  reviewed local downloads, keyboard, rendered axe/contrast and narrow layout.
- Page Info opens an empty workspace through the guarded fixed route, with no
  automatic IB breadcrumb, page data or clipboard transfer, in both browsers.

## Extended F samples — 2026-10-21

Extended F adds synthetic `soap-v2.json`: invented request/response metadata and
XML/SOAP strings, never an Oracle capture. Acceptance includes bounded XML subset
v1 (DTD/custom entity/PI rejection before DOM parsing, decoded controls, attributes,
CDATA, repeated siblings and distinct JSON/XML opening-tag citations), context/
timestamp uncertainty, explicit comparisons, withholding masked-payload comparisons,
draft preparation without numeric precision loss, case assertions/checklist notes,
stale payload reads and full clear/reload. Both browsers exercise the expanded
form, pair selection, findings, reviewed export and XML rejection without requests.

References checked 2026-10-21:
[Oracle 8.62 Service Operations Monitor](https://docs.oracle.com/cd/G41076_01/psft/pdf/pt862tibm-b112025.pdf)
and [Oracle 8.62 Integration Broker Administration](https://docs.oracle.com/cd/G41076_01/psft/pdf/pt862tiba-b112025.pdf).
They inform the separation of operational evidence and manual checklist, not the
custom envelope schema. No Oracle example payloads or delivered IDs were copied.
