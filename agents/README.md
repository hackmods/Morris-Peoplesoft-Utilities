# PeopleSoft Agent Prompt Pack

**What this is:** a set of portable, generic AI-agent/skill prompts for working on **PeopleSoft 8.56** (PeopleTools **8.5x–8.6x**, on-prem **HRMS**, **Financials**, and **Campus Solutions**). Plain markdown — Cursor, VS Code / Visual Studio + Copilot, Claude, or any chat tool. No Cursor lock-in; no required MCP server.

**What this is not:** part of the Morris PeopleSoft Utilities Chrome extension. Nothing here ships in the extension bundle.

**Design intent:** generic and reusable. No customer-specific role names, customizations, or SetIDs. Site-specific specialists stay local — see [Site-specific tailoring](#site-specific-tailoring).

**Pack version:** **v3 (alignment)** — consistent `review-*` / `assist-*` / `design-*` / `guide-*` names; SQL + integrations specialists; VS Copilot stubs; tool-fit matrix (hosts, not model SKUs).

---

## Why this exists

PeopleSoft bugs and design choices repeat: wrong effective-dated row, missing `SETID`/`EMPL_RCD`, unsafe PeopleCode SQL, IB routing inactive, CI calling `MessageBox`. These prompts encode that pattern knowledge once so any assistant can apply it.

## The agents

| Folder | Status | What it does |
|---|---|---|
| [`review-data-correctness/`](review-data-correctness/AGENT.md) | **Full (v3)** | Audit existing SQL/PeopleCode for effdt, joins, keys, wrong data source |
| [`review-peoplecode-quality/`](review-peoplecode-quality/AGENT.md) | **Full (v3)** | PeopleCode quality (`%Table`, `.Value`, scope, events); short CI-unsafe deferral |
| [`review-security/`](review-security/AGENT.md) | **Full (v3)** | Roles, PLs, SoD, row/Query/process security |
| [`assist-sql-query/`](assist-sql-query/AGENT.md) | **Full (v3)** | **Author/improve** Query Manager, AE, view SQL (VS/Copilot-friendly) |
| [`assist-integrations/`](assist-integrations/AGENT.md) | **Full (v3)** | Integration Broker + Component Interface design/triage |
| [`assist-schema-mcp/`](assist-schema-mcp/AGENT.md) | **Full (v3)** | Live/paste schema + current-row + capped SELECT; [`TOOL-CONTRACT.md`](assist-schema-mcp/TOOL-CONTRACT.md) |
| [`design-component/`](design-component/AGENT.md) | **Full (v3)** | Pre–App Designer component/page design |
| [`guide-onboarding/`](guide-onboarding/AGENT.md) | **Full (v3)** | New BA/dev mentor |
| [`guide-specialist-trainer/`](guide-specialist-trainer/GUIDE.md) | **Full (v3)** | Build a **local** specialist agent |

### Hand-offs (boundaries)

| If you are… | Use |
|---|---|
| Writing new SQL | `assist-sql-query` → then `review-data-correctness` before prod |
| Looking up keys / a sample row | `assist-schema-mcp` |
| Auditing finished SQL for silent PS bugs | `review-data-correctness` |
| Reviewing PeopleCode style/safety | `review-peoplecode-quality` |
| Designing/troubleshooting IB or CI | `assist-integrations` |
| Designing a page/component | `design-component` |
| Reviewing Roles / SoD | `review-security` |

### Rename map (v2 → v3)

| Old folder | New folder |
|---|---|
| `code-review-effdt-joins` | `review-data-correctness` |
| `peoplecode-quality` | `review-peoplecode-quality` |
| `security-role-review` | `review-security` |
| `mcp-schema-assistant` | `assist-schema-mcp` |
| `design-helper` | `design-component` |
| `onboarding-guide` | `guide-onboarding` |
| `component-agent-trainer` | `guide-specialist-trainer` |

---

## Tool fit (hosts, not models)

Prompts are **model-agnostic**. Pick the **host** that matches your workflow; use whatever LLM your org allows in that host.

| Agent family | Best host fit | Needs MCP? |
|---|---|---|
| `review-*` | Cursor on-demand rule **or** Copilot reusable prompt | No |
| `assist-sql-query`, `assist-integrations` | **VS Code / Visual Studio + Copilot** (also Cursor) | No |
| `assist-schema-mcp` | Cursor / Claude Desktop / any MCP host | Optional (paste mode works) |
| `design-*`, `guide-*` | Any chat (Claude Projects or Copilot Chat) | No |

Adoption walkthrough for wiki readers: [wiki/AI-Agent-Prompts.md](../wiki/AI-Agent-Prompts.md).

---

## How to use a prompt in your tool

Each agent has a **Quick start** section. Copy the AGENT body (frontmatter is fine) into:

- **Cursor** — Custom Mode, or `.cursor/rules/*.mdc` with `alwaysApply: false`. Wrappers: [`review-data-correctness/cursor.mdc`](review-data-correctness/cursor.mdc), [`review-peoplecode-quality/cursor.mdc`](review-peoplecode-quality/cursor.mdc), [`assist-sql-query/cursor.mdc`](assist-sql-query/cursor.mdc).
- **VS Code / Visual Studio + Copilot** — use thin stubs in [`vscode-prompts/`](vscode-prompts/README.md): copy to `.github/prompts/`, paste the matching `AGENT.md` body under the stub line, then Copilot Chat → Reuse prompts.
- **Claude** — Project custom instructions or `CLAUDE.md`.
- **Any chat tool** — paste as system/first message, then paste code/SQL/description.

---

## Site-specific tailoring

Keep tailored copies **outside this repo** or untracked (same idea as `.reference/`). Use [`guide-specialist-trainer/`](guide-specialist-trainer/GUIDE.md) to build local specialists.

## Compliance notes

Same constraints as the extension (see [`.cursor/rules/compliance-privacy.mdc`](../.cursor/rules/compliance-privacy.mdc)):

- No credentials / Quick Logins.
- No telemetry.
- MCP usage is **read-only**; never suggest production writes from chat.
- Sample data uses obvious fakes (`EMPLID = '9999999999'`).

## Contributing / extending

Add a folder under the right prefix (`review-` / `assist-` / `design-` / `guide-`), include `AGENT.md` or `GUIDE.md` with frontmatter + Quick start + Design notes, add a [`vscode-prompts/`](vscode-prompts/) stub, and a row in the table above.
