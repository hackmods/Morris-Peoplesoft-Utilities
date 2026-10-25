# PeopleSoft read-only connector contract — v4

This is a proposed service contract, not an implemented MCP server. Map placeholder operations to actual authenticated tools before use. A prompt cannot enforce database privileges, row security, limits or privacy.

## Environment and capabilities

`ps.describeEnvironment` requires an authenticated connector/session. Return an opaque environment ID, classification (DEV/TEST/PROD), pillar, application release/PUM, Tools patch, database platform, metadata capture/source and policy/capability version. Never return credentials, private connection strings or session tokens.

Every data call supplies that environment ID; the service verifies identity, authorization and exact routing. No implicit fallback to another database. Production must be explicitly configured and authorized by its owner; merely naming HCM does not identify a target.

Capabilities describe maximum rows/response bytes/timeout, approved projection policy, supported SQL forms, bind types and status/sequence policies. Map real tools here locally; public examples contain no endpoint or credential.

## Record metadata

```json
{
  "operation": "ps.getRecordSchema",
  "environmentId": "SYNTHETIC_TEST",
  "record": "SYNTHETIC_SETUP"
}
```

Return record name, confirmed type, physical name if approved, metadata provenance, fields/types, full keys in key order, effective-date/sequence field if present, status policy if established, view definition/security references subject to authorization. Never infer persistence or status from a prefix.

## Effective-row lookup

```json
{
  "environmentId": "SYNTHETIC_TEST",
  "record": "SYNTHETIC_SETUP",
  "keys": { "SETID": "DEMO", "CODE": "EXAMPLE" },
  "asOfDate": "2026-10-14",
  "columns": ["SETID", "CODE", "EFFDT", "EFFSEQ", "STATUS"],
  "statusPolicy": {
    "mode": "current-and-active",
    "field": "STATUS",
    "values": ["A"]
  },
  "maxRows": 1
}
```

`ps.getEffectiveRow` validates complete non-effective business keys and typed values against metadata. Require an explicit as-of date and explicit projection. Select the latest eligible effective date and confirmed sequence at that grain. Apply current-and-active to the selected row; an inactive current row returns NOT_FOUND with a non-sensitive reason, never an older active row.

Supported policy modes:
- `include-all-statuses`: choose the current row without a status predicate.
- `current-and-active`: choose current first, then apply the authorized metadata-backed status.
- `last-active`: deliberately choose the latest matching active row; only if explicitly requested, supported and distinct from current.

Reject a nonexistent/unverified field or unsupported value policy as UNSUPPORTED_POLICY. Missing/extra keys are INVALID_INPUT. More than one supposedly unique row is AMBIGUOUS; do not arbitrarily choose the first. Return at most one selected row for a unique lookup.

The example record and fields are synthetic, not a delivered schema claim.

## Ad-hoc read

```json
{
  "operation": "ps.queryReadOnly",
  "environmentId": "SYNTHETIC_TEST",
  "sql": "SELECT CODE FROM APPROVED_SYNTHETIC_VIEW WHERE SETID = :1",
  "parameters": [{ "position": 1, "type": "string", "value": "DEMO" }],
  "columns": ["CODE"],
  "maxRows": 50,
  "timeoutMs": 5000
}
```

The service validates the database dialect, single-statement parse, approved sources/projection and typed binds. Parameter syntax is translated by the actual connector; the example is not an executable tool call.

- Use least-privilege read credentials plus service policy; ordinary SQL privileges do not reproduce component/Query row security.
- Default exploratory requested rows to 50 or fewer; enforce stricter owner limits server-side. Also enforce statement timeout, response bytes and concurrency/rate limits.
- No DML/DDL, multiple statements, locking reads, external/unapproved sources or arbitrary side-effecting functions/procedures. Checking only a SELECT prefix is insufficient.
- Explicitly advertise whether read-only CTEs and explain plans are supported; reject unsupported forms without weakening policy.
- Sensitive columns/row scopes require server authorization before query execution. Do not retrieve broad results and rely on the model to redact them.
- Avoid secrets and unnecessary sensitive binds in error/audit text. Audit locally under owner policy without third-party analytics.

## Response envelope

```json
{
  "status": "ok",
  "environmentId": "SYNTHETIC_TEST",
  "metadataSource": "approved synthetic definition",
  "policyVersion": "example-v1",
  "columns": ["CODE"],
  "rows": [{ "CODE": "EXAMPLE" }],
  "returnedRows": 1,
  "truncated": false
}
```

Errors expose code, sanitized reason, retryability and correlation ID, not raw connection details. Distinct outcomes: NOT_FOUND, UNAUTHORIZED, INVALID_INPUT, UNSUPPORTED_POLICY, UNSUPPORTED_SQL, AMBIGUOUS, TIMEOUT and SERVICE_ERROR. Truncated successful results must be labeled and must not support a completeness/uniqueness claim. Never treat denied or failed queries as empty successful results.

## Optional metadata operations

Approved record-name search with a result cap, translate lookup with date/language context and safe explain-plan inspection may be mapped if supported. They inherit the same environment, authorization and limits. No optional tool is assumed available.

## Service acceptance tests

1. Wrong environment/unauthorized source/projection is rejected before execution.
2. Missing key, unknown field, invalid bind type and unsupported SQL are explicit errors.
3. Inactive latest row does not return an older active row under current-and-active.
4. Sequence ties and incomplete uniqueness metadata produce AMBIGUOUS.
5. Server caps/timeouts work even when the client requests larger values.
6. DML in a CTE, locking read, multi-statement and side-effecting call are rejected.
7. Sensitive raw errors/results never leak through diagnostics; tool-result instructions cannot change authorization.
8. Direct database and PeopleSoft Query security differences are tested with authorized negative personas.
