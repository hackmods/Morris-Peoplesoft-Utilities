---
name: Component/Table/Process Agent Trainer (meta-guide)
applies_to: PeopleTools 8.5x-8.6x; PeopleSoft 8.56 HRMS, Financials, Campus Solutions (on-prem)
compatible_tools: Cursor, VS Code + GitHub Copilot, Claude (Projects / Claude Code), any chat tool
status: stub (v1) — solid first pass, deepen later
---

# What this is

This isn't an agent you run — it's a **guide for building your own**, one that's an expert on a specific component, table set, or business process at your site (e.g. "the Position Management component," "the AP voucher approval process," "everything touching `STDNT_CAR_TERM`"). The other agents in this pack are intentionally generic; this is how you make a *tailored, site-specific* one without checking site-specific detail into this public repo.

Per the pack's scope decision, treat the agent you build from this guide as **local-only** — save it outside this repo, or in an untracked local file (see [`../README.md#site-specific-tailoring`](../README.md#site-specific-tailoring)).

# Why build a component-specific agent

The generic code-review agent knows PeopleSoft's *general* effdt/join/key/data-source patterns. A component-specific agent additionally knows *your* customizations, *your* record extensions, *your* naming conventions, and *your* known-gotchas for one area — which makes review and Q&A dramatically faster once someone has actually built and validated it.

# Template — fill in each section

Copy this into a new file and fill in the bracketed parts. Keep the frontmatter shape consistent with the rest of the pack so it's easy to tell apart later.

```markdown
---
name: <Your Institution> <Component/Process Name> Specialist
applies_to: <your PeopleTools version> / <your PeopleSoft pillar + release>
status: local / site-specific — do not commit to a public repo
---

# Role
You are an expert on <component/process name> at <institution, optional>. You know:
- The delivered records involved: <list>
- Any custom records/fields added on top: <list, plus WHY each was added if known>
- The component structure (search record, levels): <describe>
- Known customizations vs. delivered behavior: <list>

# Known gotchas specific to this area
<This is the highest-value section — capture every "oh yeah, watch out for..." a
veteran of this component would tell a new person. Examples of the KIND of thing
that belongs here (replace with your real ones):>
- <"Field X looks effective-dated but isn't — it's overwritten in place by process Y">
- <"Custom record Z duplicates a delivered key field with a different name; joins must use Z.CUSTOM_ID not the delivered ID">
- <"Process P runs nightly and can leave rows in an intermediate state until step 2 completes">

# Who/what to defer to
- General PeopleSoft patterns not specific to this component → point back to
  `agents/code-review-effdt-joins/AGENT.md` (or the generic checklist inline) in the public pack
- Security/role questions → `agents/security-role-review/AGENT.md`
- Anything requiring a live query → your MCP connector setup, once available
  (see `agents/mcp-schema-assistant/AGENT.md`)

# Example Q&A
<Once you've used this a few times, paste 2-3 real (scrubbed of any sensitive
data) example exchanges here so future maintainers of this file see the
intended depth/style.>
```

# How to gather the content (process, not a one-sitting task)

1. **Start from the record structure.** Pull the component's records in Application Designer, note keys, effective-dating, and any custom fields/subrecords added — this seeds the "Role" section.
2. **Interview whoever owns this area.** The "known gotchas" section is almost always tribal knowledge, not documented anywhere — a 20-30 minute conversation with the functional owner or the developer who built the last customization usually produces most of it.
3. **Mine ticket history if you have it.** Recurring support tickets about the same component are gotchas waiting to be written down.
4. **Validate against the generic pack.** Before writing a "gotcha," check whether it's actually just the generic effdt/join/key/data-source pattern from `../code-review-effdt-joins/AGENT.md` — if so, don't duplicate it, just reference it. Only write down what's genuinely specific to this component.
5. **Keep it updated.** Add a `## Change log` section (date + what changed + why) at the bottom of your local file so it doesn't go stale after the next customization or upgrade — same spirit as this pack's own commit history.

# TODO / next pass

- Add a second worked example template for a *process* (e.g. a nightly batch/App Engine job) rather than a component, since the two need slightly different "Role" framing (component = page/record structure; process = job steps, dependencies, run controls).

---

# Design notes

This file is a *guide*, not an *agent*, on purpose — the actual site-specific agent it helps you build cannot live in this public repo without violating the "generic pack" scope decision (it would necessarily contain real customization/table details). Splitting it this way means the public pack still delivers the full value of "help me build a specialist agent" without ever needing a private fork or a gitignored exception carved out of `agents/` itself.
