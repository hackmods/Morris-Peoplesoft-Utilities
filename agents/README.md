# PeopleSoft Agent Prompt Pack

**What this is:** a set of portable, generic AI-agent/skill prompts for working on **PeopleSoft 8.56** (PeopleTools **8.5x–8.6x**, on-prem **HRMS**, **Financials**, and **Campus Solutions**). They're written as plain markdown so you can drop them into whatever AI tool you're using — they don't depend on any Cursor-specific feature, and they don't depend on any particular MCP server.

**What this is not:** part of the Morris PeopleSoft Utilities Chrome extension. Nothing here ships in the extension bundle, touches `src/`, or is loaded by `manifest.json`. This folder is a side toolkit — prompts and guides you use *while developing* PeopleSoft, not code the extension executes in the browser.

**Design intent:** generic and reusable. Nothing in this folder should contain a specific customer's role names, table customizations, security tree structure, or business-unit/setid values. If you tailor a prompt for your own site, keep that tailored copy outside this repo (or in a local, gitignored file) — see [Site-specific tailoring](#site-specific-tailoring) below.

---

## Why this exists

PeopleSoft has a small set of bugs that show up over and over — wrong effective-dated row picked, a join missing `SETID`/`BUSINESS_UNIT`, querying a base table instead of the view Query Manager exposes, a permission list that's wider than intended. These are pattern-matchable, which makes them a good fit for an AI agent that's been told what to look for. This pack is that knowledge, written down once, in a form you can hand to any assistant.

## The agents

| Folder | Status | What it does |
|---|---|---|
| [`code-review-effdt-joins/`](code-review-effdt-joins/AGENT.md) | **Full (v2)** | Effective-date logic, bad joins, missing keys, wrong data sources — review protocol, EFFSEQ pattern, SETID example |
| [`peoplecode-quality/`](peoplecode-quality/AGENT.md) | **Full (v2)** | Meta-SQL, `.Value`, variables, SQL safety, events, **App Classes**, **CI/non-interactive** constraints — best for batch code review |
| [`security-role-review/`](security-role-review/AGENT.md) | **Full (v2)** | Permission lists, roles, row/Query/process security, pillar SoD matrices (HCM/FSCM/CS), worked review example |
| [`mcp-schema-assistant/`](mcp-schema-assistant/AGENT.md) | **Full (v2)** | Read-only schema / current-row / sample query playbooks (MCP or paste-based); [`TOOL-CONTRACT.md`](mcp-schema-assistant/TOOL-CONTRACT.md) for DBA connectors |
| [`design-helper/`](design-helper/AGENT.md) | **Full (v2)** | Pre–App Designer plans: Classic vs Fluid, search record, levels, effdt, upgrade risk, worked example |
| [`onboarding-guide/`](onboarding-guide/AGENT.md) | **Full (v2)** | New BA/dev mentor — concept-first, pillar day-one tracks, glossary, hand-offs to other agents |
| [`component-agent-trainer/`](component-agent-trainer/GUIDE.md) | **Full (v2)** | Build a **local** specialist agent — interview script, component / process / table-set templates, quality bar |

All seven are meant to be usable as-is for real reviews and planning — not placeholder stubs.

## How to use a prompt in your tool

Adoption-focused walkthrough (which agent to pick, wiki audience): [wiki/AI-Agent-Prompts.md](../wiki/AI-Agent-Prompts.md). Each agent file also has a short **Quick start** section tailored to that prompt.

Each agent is a single markdown file with YAML frontmatter followed by plain instructions. Copy the body (everything after the frontmatter, or the whole file — most tools tolerate the frontmatter fine) into:

- **Cursor** — paste into a [Custom Mode](https://docs.cursor.com) system prompt, or save as a project rule under `.cursor/rules/*.mdc` with `alwaysApply: false` so it's available on demand. The code-review agent ships a ready-made wrapper: [`code-review-effdt-joins/cursor.mdc`](code-review-effdt-joins/cursor.mdc).
- **VS Code + GitHub Copilot** — paste into a `.github/copilot-instructions.md` (repo-wide) or a reusable prompt file under `.github/prompts/*.prompt.md` (Copilot Chat → "Reuse prompts").
- **Claude (Projects or Claude Code)** — paste into a Project's custom instructions, or a `CLAUDE.md` at the root of the repo you're working in.
- **Any other chat tool** — paste as the first message / system prompt, then paste the code, SQL, or PeopleCode you want reviewed.

None of these prompts require tool use to be useful — you can always just paste code and ask "review this against the checklist." The MCP assistant is the one exception: it's written assuming your chat tool can call out to a PeopleSoft MCP connector, and degrades gracefully (asks you to paste the data instead) if it can't.

## Site-specific tailoring

If you want a version of these prompts tuned to your own environment (real record names beyond delivered ones, your security role naming convention, your customizations), keep that copy **outside this repo** or in an untracked local file (this repo already gitignores `.reference/` for the same reason — see [`AGENTS.md`](../AGENTS.md)). That keeps the public pack safe to share with the wider PeopleSoft community while still letting you build a sharper, private version for your own shop.

## Compliance notes

This pack follows the same constraints as the rest of the repo (see [`.cursor/rules/compliance-privacy.mdc`](../.cursor/rules/compliance-privacy.mdc)):

- No credentials, Quick Logins, or password-handling guidance.
- No telemetry — these are static prompts, nothing phones home.
- If an agent works with an MCP connector, it should treat query access as **read-only** and never suggest writing production data as part of a "review" or "assist" task.
- Favorites/exports of real business keys are out of scope here entirely; if a prompt ever produces sample data, it should use obviously fake values (e.g. `EMPLID = '9999999999'`).

## Contributing / extending

Adding a new agent: create a folder, add an `AGENT.md` (or `GUIDE.md` for meta/how-to content) with the same frontmatter shape as the existing ones, and add a row to the table above. Log the reasoning behind new or changed checklist items in that agent's own `## Design notes` section (see the code-review agent for the pattern) so future contributors know *why* a check exists, not just that it does.
