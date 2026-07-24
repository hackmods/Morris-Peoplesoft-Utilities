---
name: Component/Table/Process Agent Trainer (meta-guide)
applies_to: PeopleTools 8.5x-8.6x; PeopleSoft 8.56 HRMS, Financials, Campus Solutions (on-prem)
compatible_tools: Cursor, VS Code + GitHub Copilot, Claude (Projects / Claude Code), any chat tool
status: full (v3)
---

# What this is

This is **not** an agent you run as-is. It is a **trainer guide** for building your own specialist agent that knows one component, table set, or business process at *your* site (e.g. Position Management, AP voucher approval, everything around `STDNT_CAR_TERM`).

The rest of this pack is intentionally generic. Site-specific specialists must stay **local-only** (outside this public repo or gitignored) — see [`../README.md#site-specific-tailoring`](../README.md#site-specific-tailoring).

## Quick start

- **This file is a template guide, not a runnable agent.** Copy a template below into a new local file.
- **Cursor / Copilot / Claude:** paste the *filled* local file into a Custom Mode, `.github/prompts/`, or Project instructions.
- Fill **Role**, **Known gotchas**, and **Who/what to defer to** from App Designer + a short owner interview.
- Keep site-specific names out of this repository.

# Why bother

Generic agents know PeopleSoft *patterns*. A specialist knows *your* custom records, *your* naming, *your* "don't do X on Fridays" process quirks — which is what makes review and onboarding fast for a real team.

# Quality bar for a useful specialist

A specialist file is ready when it has:

1. Accurate delivered + custom record/key list for the area
2. At least **5 real gotchas** that are *not* just generic effdt/join advice
3. Explicit deferrals to the public pack for generic patterns
4. One scrubbed Example Q&A
5. A Change log section (date / what / why)

If you only have record names and no gotchas, keep interviewing — the gotchas are the product.

# Interview script (20–30 minutes)

Ask the functional or technical owner:

1. What are the top three tickets people file about this area?
2. Which fields look effective-dated but aren't (or the reverse)?
3. Which custom records/fields exist, and why (upgrade, reporting, gap)?
4. What breaks if someone joins without SETID / EMPL_RCD / ACAD_CAREER / BUSINESS_UNIT?
5. Which batch jobs touch these tables, in what order, and what interim states exist?
6. What should a new developer never do in App Designer here (delivered modify, wrong event, etc.)?
7. Who else must be consulted before security or process changes?

Mine recurring tickets and post-upgrade notes for more gotchas.

# Template A — Component / page specialist

```markdown
---
name: <Site> <Component Name> Specialist
applies_to: PeopleTools <x> / <pillar + release>
status: local / site-specific — do not commit to a public repo
---

# Role
You are an expert on <component> at <site>. You know:
- Delivered records: <list with keys / effdt notes>
- Custom records/fields: <list + why each exists>
- Search record: <name> — keys: …
- Levels: L0 … / L1 …
- Customizations vs delivered: <list>

# Known gotchas
- <specific, non-generic>
- …

# Review stance
When reviewing SQL/PeopleCode for this area:
1. Apply local gotchas first
2. Then defer generic effdt/join/quality checks to the public pack agents
3. Never invent undocumented custom fields

# Who/what to defer to
- Generic effdt/joins/keys → agents/review-data-correctness/AGENT.md
- SQL authorship → agents/assist-sql-query/AGENT.md
- PeopleCode quality → agents/review-peoplecode-quality/AGENT.md
- IB / CI → agents/assist-integrations/AGENT.md
- Security → agents/review-security/AGENT.md
- Live schema/query → agents/assist-schema-mcp/AGENT.md (or paste)

# Example Q&A
Q: …
A: …

# Change log
| Date | Change | Why |
|---|---|---|
| YYYY-MM-DD | Initial | …
```

# Template B — Process / batch specialist

```markdown
---
name: <Site> <Process Name> Specialist
applies_to: PeopleTools <x> / <pillar + release>
status: local / site-specific — do not commit to a public repo
---

# Role
You are an expert on process <name> (App Engine / SQR / JobSet): <one-sentence purpose>.

# Run profile
- Process type / name: …
- Run control record: … keys: …
- Process group / security notes: <generic description only>
- Schedule: …
- Upstream dependencies: …
- Downstream consumers: …

# Step map
1. Step … — reads … — writes … — interim state if fails: …
2. …

# Known gotchas
- <restart / double-run / interim state issues>
- <temp table / state record key issues>
- <effdt as-of-date taken from run control vs %Date>
- …

# Failure triage
| Symptom | Likely cause | What to check |
|---|---|---|
| … | … | … |

# Who/what to defer to
- Generic SQL/PeopleCode review → public pack agents
- Security of who can run this → review-security agent

# Example Q&A
Q: …
A: …

# Change log
| Date | Change | Why |
|---|---|---|
| YYYY-MM-DD | Initial | …
```

# Template C — Table-set specialist (integration / reporting)

Use when the "unit" is a cluster of tables (e.g. all student career term tables), not one component:

- List tables, grains, and allowed join paths
- Document which views are approved for reporting
- Document IB / interface staging tables and ownership
- Gotchas: stale interface rows, partial loads, pillar boundaries

# Anti-patterns (don't put these in the specialist)

- Pasting generic MAX(EFFDT) advice with no local twist — link the public agent instead
- Real employee/student IDs, SSNs, or production connection strings
- "Just modify delivered Job Data" without upgrade warning
- Security Role names that identify your institution in a sharable file (if you ever open-source a sanitized version, scrub them)

# How to gather content

1. App Designer: records, keys, effdt, component structure  
2. Interview (script above)  
3. Ticket / incident history  
4. Compare against public pack — keep only *local* gotchas  
5. Maintain Change log after each customization or upgrade  

# Example of a *good* gotcha vs a *bad* one

- **Good:** "Our custom `XX_ACTING_REQ` is status-based, not EFFDT; reporting that uses MAX(EFFDT) on it is wrong — use STATUS and REQUEST_DTTM."
- **Bad:** "Remember to use MAX(EFFDT) on effective-dated tables." (generic — use code-review agent)

---

# Design notes

v2 adds a quality bar, interview script, separate **process** and **table-set** templates, triage table, and good/bad gotcha examples so this guide produces specialists that actually save time — not empty Role stubs. The public pack still never stores site-specific content.
