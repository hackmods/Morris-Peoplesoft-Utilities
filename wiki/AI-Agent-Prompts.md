# AI agent prompts for PeopleSoft development

MPU ships a **side toolkit** of portable AI prompts for PeopleSoft work — separate from the Chrome extension. Use them in **Cursor**, **VS Code / Visual Studio + GitHub Copilot**, **Claude**, or any chat tool. Nothing in the pack runs inside the browser or phones home.

**Source of truth:** [`agents/README.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/README.md)

**Target stack:** PeopleSoft **8.56**, PeopleTools **8.5x–8.6x**, on-prem **HRMS**, **Financials**, and **Campus Solutions**. Prompts stay **generic**.

**Pack v3:** folders renamed to `review-*` / `assist-*` / `design-*` / `guide-*`; added SQL authoring and IB/CI integration agents; VS Copilot stubs under `agents/vscode-prompts/`.

---

## Which agent should I use?

| If you need to… | Use |
|---|---|
| Spot wrong effective dates, bad joins, missing keys, wrong table/view | [review-data-correctness](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-data-correctness/AGENT.md) |
| Automate PeopleCode quality review (`%Table`, `.Value`, variables, SQL safety) | [review-peoplecode-quality](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-peoplecode-quality/AGENT.md) |
| Author or improve Query / AE / view SQL | [assist-sql-query](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-sql-query/AGENT.md) |
| Integration Broker or Component Interface design/triage | [assist-integrations](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-integrations/AGENT.md) |
| Review permission lists, roles, SoD, row/Query security | [review-security](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-security/AGENT.md) |
| Look up schema / current row (MCP or paste) | [assist-schema-mcp](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-schema-mcp/AGENT.md) |
| Plan a new or changed component/page | [design-component](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/design-component/AGENT.md) |
| Orient a new BA or developer | [guide-onboarding](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/guide-onboarding/AGENT.md) |
| Build your own specialist agent for one area | [guide-specialist-trainer](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/guide-specialist-trainer/GUIDE.md) |

Typical flow: **write SQL** with `assist-sql-query` → **audit** with `review-data-correctness`. For PeopleCode, run **quality** then **data-correctness** when SQL/data is involved.

---

## The agents (full list)

| Agent | Status | What it does |
|---|---|---|
| [review-data-correctness](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-data-correctness/AGENT.md) | **Full (v3)** | Effdt, joins, keys, wrong data sources |
| [review-peoplecode-quality](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-peoplecode-quality/AGENT.md) | **Full (v3)** | Meta-SQL, `.Value`, variables, SQL safety, App Classes |
| [review-security](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-security/AGENT.md) | **Full (v3)** | Roles, PLs, SoD matrices |
| [assist-sql-query](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-sql-query/AGENT.md) | **Full (v3)** | Author/improve Query/AE/view SQL |
| [assist-integrations](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-integrations/AGENT.md) | **Full (v3)** | IB + CI design and failure triage |
| [assist-schema-mcp](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-schema-mcp/AGENT.md) | **Full (v3)** | Schema/current-row lookup; [tool contract](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-schema-mcp/TOOL-CONTRACT.md) |
| [design-component](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/design-component/AGENT.md) | **Full (v3)** | Classic vs Fluid, search records, levels |
| [guide-onboarding](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/guide-onboarding/AGENT.md) | **Full (v3)** | New-to-PeopleSoft orientation |
| [guide-specialist-trainer](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/guide-specialist-trainer/GUIDE.md) | **Full (v3)** | Train a **local** specialist agent |

VS Copilot stubs: [`agents/vscode-prompts/`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/tree/main/agents/vscode-prompts).

---

## Tool fit (hosts, not models)

| Work | Prefer |
|---|---|
| Code/SQL review rules | Cursor on-demand rule or Copilot prompt |
| SQL authorship, IB/CI | **Visual Studio / VS Code + Copilot** |
| Live schema via MCP | Cursor / Claude Desktop (MCP host) |
| Onboarding / design chat | Any chat product |

Prompts do **not** prescribe a specific GPT/Claude model SKU — use what your org allows.

---

## How to load a prompt (short version)

1. Open the agent’s `AGENT.md` (or `GUIDE.md`) on GitHub or from a clone.
2. Copy the file.
3. Paste into Cursor Custom Mode / `.cursor/rules`, Copilot `.github/prompts/` (see stubs), or Claude Project instructions.
4. Paste the PeopleCode, SQL, IB symptom, or design question.

Details: [`agents/README.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/README.md).

---

## Related wiki pages

- [Use cases — Technical](Use-Cases-Technical)
- [Development](Development)
- [Privacy and compliance](Privacy-and-Compliance)
