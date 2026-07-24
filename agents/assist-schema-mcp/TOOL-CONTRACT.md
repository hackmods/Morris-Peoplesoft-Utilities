# Expected MCP tool contract

These are **placeholder tool shapes**, not a real MCP server. Nothing here is implemented in this repo — this documents what `AGENT.md` assumes exists, so that when your DBA team's PeopleSoft MCP connector ships, you can either name its tools to match or update the mapping table below.

**Agent expectations:** tools are **read-only**; the agent must refuse write operations even if a write tool appears.

## `ps.getRecordSchema`

Looks up a record's field list, key structure, and effective-date behavior.

**Input:**
```json
{ "record": "JOB", "pillar": "HCM" }
```
`pillar` optional — use when the connector spans multiple databases.

**Expected output shape:**
```json
{
  "record": "JOB",
  "fields": [
    { "name": "EMPLID", "isKey": true, "keyOrder": 1, "type": "CHAR" },
    { "name": "EMPL_RCD", "isKey": true, "keyOrder": 2, "type": "NUMBER" },
    { "name": "EFFDT", "isKey": true, "keyOrder": 3, "type": "DATE", "isEffectiveDate": true },
    { "name": "EFFSEQ", "isKey": true, "keyOrder": 4, "type": "NUMBER", "isEffSeq": true }
  ],
  "isEffectiveDated": true,
  "hasEffSeq": true,
  "isTableSetShared": false
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

**Expected behavior:** internally applies correlated MAX(EFFDT) + EFFSEQ tie-break + optional `EFF_STATUS = 'A'` (see `../review-data-correctness/AGENT.md` §1). Returns at most one row or an empty result with a clear reason.

## `ps.queryReadOnly`

Runs a read-only, capped-row ad-hoc SQL query.

**Input:**
```json
{ "sql": "SELECT ...", "maxRows": 50, "pillar": "HCM" }
```

**Expected behavior:**
- Rejects anything that is not a single `SELECT` (no DDL/DML, no multiple statements).
- Enforces `maxRows` server-side (default/max policy set by DBAs — agent should still request ≤ 50 for exploration).
- Prefer binding parameters if the connector supports them; never require the agent to embed secrets in SQL.

## Optional (nice-to-have) tools

| Name | Purpose |
|---|---|
| `ps.listRecords(prefix)` | Search record names (`JOB%`) without dumping the catalog |
| `ps.getTranslateValues(fieldName)` | XLAT values for a field |
| `ps.explainQuery(sql)` | DB explain plan for performance discussion (still read-only) |

Wire these in the mapping table if/when available; `AGENT.md` playbooks do not require them.

## Tool mapping (fill in once the real connector exists)

| Placeholder name here | Real MCP tool name | Notes |
|---|---|---|
| `ps.getRecordSchema` | _TBD_ | |
| `ps.getEffectiveRow` | _TBD_ | |
| `ps.queryReadOnly` | _TBD_ | |
| `ps.listRecords` | _TBD_ | optional |
| `ps.getTranslateValues` | _TBD_ | optional |
| `ps.explainQuery` | _TBD_ | optional |

## DBA checklist for a safe connector

1. Connect only to **non-prod** by default; prod requires explicit, audited config.
2. DB user is **SELECT-only** (no INSERT/UPDATE/DELETE/EXECUTE of arbitrary procs if avoidable).
3. Enforce row limits and statement timeouts server-side.
4. Optionally block columns known to be highly sensitive unless a role flag allows them.
5. Log tool calls for audit without sending query text to third-party analytics.
