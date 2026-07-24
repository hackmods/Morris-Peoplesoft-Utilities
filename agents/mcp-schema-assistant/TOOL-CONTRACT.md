# Expected MCP tool contract

These are **placeholder tool shapes**, not a real MCP server. Nothing here is implemented in this repo — this documents what `AGENT.md` assumes exists, so that when your DBA team's PeopleSoft MCP connector ships, you can either name its tools to match or update the mapping table below.

## `ps.getRecordSchema`

Looks up a record's field list, key structure, and effective-date behavior.

**Input:**
```json
{ "record": "JOB" }
```

**Expected output shape:**
```json
{
  "record": "JOB",
  "fields": [
    { "name": "EMPLID", "isKey": true, "keyOrder": 1 },
    { "name": "EMPL_RCD", "isKey": true, "keyOrder": 2 },
    { "name": "EFFDT", "isKey": true, "keyOrder": 3, "isEffectiveDate": true },
    { "name": "EFFSEQ", "isKey": true, "keyOrder": 4 }
  ],
  "isEffectiveDated": true,
  "hasEffSeq": true
}
```

## `ps.getEffectiveRow`

Fetches the single current-as-of row for a given set of business keys on an effective-dated record.

**Input:**
```json
{
  "record": "JOB",
  "keys": { "EMPLID": "9999999999", "EMPL_RCD": 0 },
  "asOfDate": "2026-07-24",
  "activeOnly": true
}
```

**Expected behavior:** internally applies the correlated-MAX(EFFDT) + EFFSEQ tie-break + optional `EFF_STATUS = 'A'` pattern described in `../code-review-effdt-joins/AGENT.md` §1, so the caller doesn't have to hand-roll it.

## `ps.queryReadOnly`

Runs a read-only, capped-row ad-hoc SQL query.

**Input:**
```json
{ "sql": "SELECT ...", "maxRows": 50 }
```

**Expected behavior:** rejects (or the caller should refuse to send) anything that isn't a `SELECT`; enforces `maxRows` server-side, not just as a hint.

## Tool mapping (fill in once the real connector exists)

| Placeholder name here | Real MCP tool name | Notes |
|---|---|---|
| `ps.getRecordSchema` | _TBD_ | |
| `ps.getEffectiveRow` | _TBD_ | |
| `ps.queryReadOnly` | _TBD_ | |
