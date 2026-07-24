# AI agent prompts for PeopleSoft development

MPU ships a **side toolkit** of portable AI prompts for PeopleSoft work — separate from the Chrome extension. Use them in **Cursor**, **VS Code + GitHub Copilot**, **Claude**, or any chat tool to speed up code review, security review, design planning, and onboarding. Nothing in the pack runs inside the browser or phones home; you paste the prompt, then paste your PeopleCode/SQL/description.

**Source of truth in the repo:** [`agents/README.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/README.md) (compliance notes, site-tailoring guidance, and how to load prompts in each tool).

**Target stack:** PeopleSoft **8.56**, PeopleTools **8.5x–8.6x**, on-prem **HRMS**, **Financials**, and **Campus Solutions**. Prompts stay **generic** (no customer-specific role names or customizations).

---

## Which agent should I use?

| If you need to… | Use |
|---|---|
| Spot wrong effective dates, bad joins, missing keys, or the wrong table/view | [Code review — effdt / joins / keys](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/code-review-effdt-joins/AGENT.md) |
| Automate PeopleCode quality review (`%Table`, `.Value`, variables, SQL safety) | [PeopleCode quality](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/peoplecode-quality/AGENT.md) |
| Review permission lists, roles, row-level or Query security patterns | [Security / role review](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/security-role-review/AGENT.md) |
| Ask schema / “current row” questions (with or without an MCP DB connector) | [MCP schema assistant](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/mcp-schema-assistant/AGENT.md) |
| Plan a new or changed component/page before App Designer | [Design helper](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/design-helper/AGENT.md) |
| Orient a new BA or developer to PeopleSoft vocabulary | [Onboarding guide](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/onboarding-guide/AGENT.md) |
| Build your **own** specialist agent for one component / table set / process | [Component agent trainer](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/component-agent-trainer/GUIDE.md) |

For a full program review, run **PeopleCode quality** and **effdt / joins** together — one covers style and safety, the other covers data-correctness bugs.

---

## The agents (full list)

| Agent | Status | What it does |
|---|---|---|
| [code-review-effdt-joins](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/code-review-effdt-joins/AGENT.md) | **Full (v2)** | Effective-date logic, bad joins, missing keys, wrong data sources |
| [peoplecode-quality](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/peoplecode-quality/AGENT.md) | **Full (v2)** | Meta-SQL, `.Value`, variables, SQL safety, App Classes, CI constraints |
| [security-role-review](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/security-role-review/AGENT.md) | **Full (v2)** | Permission lists, roles, row/Query/process security, SoD matrices |
| [mcp-schema-assistant](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/mcp-schema-assistant/AGENT.md) | **Full (v2)** | Schema / current-row / sample query (MCP or paste); [tool contract](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/mcp-schema-assistant/TOOL-CONTRACT.md) |
| [design-helper](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/design-helper/AGENT.md) | **Full (v2)** | Classic vs Fluid, search records, levels, upgrade risk |
| [onboarding-guide](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/onboarding-guide/AGENT.md) | **Full (v2)** | New-to-PeopleSoft orientation (BA or developer) |
| [component-agent-trainer](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/component-agent-trainer/GUIDE.md) | **Full (v2)** | Meta-guide to train a **local** specialist agent |

Each file includes a **Quick start** section (Cursor / Copilot / Claude) and, where useful, a `cursor.mdc` wrapper for on-demand Cursor rules.

---

## How to load a prompt (short version)

1. Open the agent’s `AGENT.md` (or `GUIDE.md`) on GitHub or from a clone of the repo.
2. Copy the file (frontmatter is fine for most tools).
3. Paste into:
   - **Cursor** — Custom Mode system prompt, or `.cursor/rules/*.mdc` with `alwaysApply: false`
   - **VS Code + Copilot** — `.github/prompts/<name>.prompt.md` → Copilot Chat → Reuse prompts
   - **Claude** — Project custom instructions or `CLAUDE.md`
4. Paste the PeopleCode, SQL, security description, or design question you want help with.

Details and compliance notes: [`agents/README.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/README.md).

---

## Related wiki pages

- [Use cases — Technical](Use-Cases-Technical)
- [Development](Development)
- [Privacy and compliance](Privacy-and-Compliance)
