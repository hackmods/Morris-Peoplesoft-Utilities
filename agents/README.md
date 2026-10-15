# PeopleSoft Agent Prompt Pack

Content version **4.0.1** · **22 complete prompts** (21 task agents and one specialist-building guide) · **3 local pillar templates**.

Portable knowledge for PeopleSoft on **PeopleTools 8.62**. Confirm the application release/PUM and Tools patch separately. The pack supports HCM, FSCM and Campus Solutions workflows; it stays separate from the Morris PeopleSoft Utilities Chrome extension.

Every prompt includes intake, workflow, output, synthetic examples, validation and handoffs. Definitions are self-contained. No MCP server is required or implemented. Source links were reviewed on 2026-10-14; IDE, model-behavior and real-system trials are **not run**.

The extension's Options → Agents page provides a searchable reference catalog, role/audience hints and links to these public files. Prepare task brief creates an editable blank request for a selected prompt; it reads no PeopleSoft page context and is not saved. Load the actual prompt/skill in your AI tool before using the brief. Only public reference metadata is bundled in the extension; full definitions, skills and templates remain in this separate toolkit. The extension does not execute agents or send page data to an AI service.

## Choose by task

- **BA work:** design-functional-requirements → design-component/assist-fluid → design-test-uat.
- **SQL/reporting:** assist-schema-mcp (or paste metadata) → assist-sql-query → review-data-correctness → assist-reporting.
- **PeopleCode:** assist-peoplecode → review-peoplecode-quality and review-data-correctness where data logic is involved.
- **Batch/operations:** assist-application-engine, assist-process-scheduler, assist-admin-diagnostics, assist-performance-trace.
- **Integrations/approvals:** assist-integrations, assist-approval-framework, review-security.
- **UI:** assist-fluid plus review-fluid-accessibility; design-component for transaction/search structure.
- **Change/conversion:** review-upgrade-migration, design-data-conversion and design-test-uat.
- **Learning/local expertise:** guide-onboarding and guide-specialist-trainer.

<!-- CATALOG-BEGIN -->

| Prompt | Kind | Use |
|---|---|---|
| [assist-admin-diagnostics](assist-admin-diagnostics/AGENT.md) | agent | Triage PeopleSoft PIA, web/application domains, Process Scheduler and IB boundaries using sanitized logs and configuration evidence. |
| [assist-application-engine](assist-application-engine/AGENT.md) | agent | Design and troubleshoot PeopleSoft AE programs, state records, temporary tables, commit/restart boundaries and concurrent execution. |
| [assist-approval-framework](assist-approval-framework/AGENT.md) | agent | Design and troubleshoot PeopleSoft approval routing, participant resolution, delegation, escalation and transaction controls. |
| [assist-fluid](assist-fluid/AGENT.md) | agent | Design and troubleshoot PeopleSoft Fluid components, layouts, search, tiles, navigation collections and modal behavior. |
| [assist-integrations](assist-integrations/AGENT.md) | agent | Design and troubleshoot PeopleSoft IB and Component Interfaces, including security, CI event timing, error collections and safe replay. |
| [assist-peoplecode](assist-peoplecode/AGENT.md) | agent | Draft PeopleCode and application-class solutions with explicit caller, event, buffer context, dependencies and validation. |
| [assist-performance-trace](assist-performance-trace/AGENT.md) | agent | Analyze scrubbed PeopleSoft SQL, PeopleCode and AE traces, timings, plans and lock evidence; design bounded diagnostic capture. |
| [assist-process-scheduler](assist-process-scheduler/AGENT.md) | agent | Triage PeopleSoft process execution, run controls, scheduling dependencies and report distribution from sanitized monitor evidence. |
| [assist-reporting](assist-reporting/AGENT.md) | agent | Design and troubleshoot BI Publisher, Query/Connected Query and existing SQR report data, templates, reconciliation and distribution. |
| [assist-schema-mcp](assist-schema-mcp/AGENT.md) | agent | Inspect authorized PeopleSoft record metadata and bounded read-only samples through a mapped connector or sanitized pasted definitions. |
| [assist-sql-query](assist-sql-query/AGENT.md) | agent | Draft or improve PeopleSoft Query, AE, view and PeopleCode SQL using known metadata, explicit result grain and supported syntax. |
| [design-component](design-component/AGENT.md) | agent | Plan PeopleSoft component, search, record and scroll structures across Classic and Fluid with security, history and upgrade tradeoffs. |
| [design-data-conversion](design-data-conversion/AGENT.md) | agent | Plan PeopleSoft conversion mappings, staging, supported load interfaces, rejects, reconciliation, restart and cutover. |
| [design-functional-requirements](design-functional-requirements/AGENT.md) | agent | Develop PeopleSoft BA requirements, process maps, configuration fit/gap, business rules and testable acceptance criteria. |
| [design-test-uat](design-test-uat/AGENT.md) | agent | Create traceable PeopleSoft unit, integration, security, UAT and upgrade regression plans, including PTF where suitable. |
| [guide-onboarding](guide-onboarding/AGENT.md) | agent | Teach PeopleSoft concepts and safe first tasks for BAs, developers and administrators with pillar-specific learning routes. |
| [guide-specialist-trainer](guide-specialist-trainer/GUIDE.md) | guide | Create and maintain private HCM, FSCM or Campus Solutions specialists from verified local definitions, policies, incidents and acceptance cases. |
| [review-data-correctness](review-data-correctness/AGENT.md) | agent | Review existing PeopleSoft SQL, Query, PeopleCode SQL, AE or SQR for result grain, effective dating, keys, joins and data sources. |
| [review-fluid-accessibility](review-fluid-accessibility/AGENT.md) | agent | Review rendered PeopleSoft Fluid and Classic tasks for keyboard, focus, semantics, errors, contrast, zoom and assistive-technology barriers. |
| [review-peoplecode-quality](review-peoplecode-quality/AGENT.md) | agent | Review PeopleCode APIs, SQL construction, buffer access, event placement, error handling and reusable application classes. |
| [review-security](review-security/AGENT.md) | agent | Review effective PeopleSoft page, row, Query, process, CI and integration access and evidence-based segregation of duties. |
| [review-upgrade-migration](review-upgrade-migration/AGENT.md) | agent | Review PeopleTools/application updates, object compares, customization impact and controlled object/configuration migration plans. |

<!-- CATALOG-END -->

## Visual Studio and VS Code Copilot

Copy selected complete files from [vscode-prompts](vscode-prompts/README.md) into your PeopleSoft solution's `.github/prompts/`. No paste section or sibling definition is required. Attach the task/code/metadata in chat and invoke the prompt through `#prompt:`, the context picker or slash command supported by your installed host. [Microsoft's Visual Studio guide](https://learn.microsoft.com/en-us/visualstudio/ide/copilot-chat-context?view=vs-2022).

Start with one prompt per task; use named handoffs when appropriate. Do not paste the entire pack into a global instruction file. Host policy and available tools still govern actions.

## Claude and Codex skills

Copy selected `skills/ps-*/` directories intact to your project's `.claude/skills/` for Claude Code or `.agents/skills/` for Codex. Their `SKILL.md` files contain complete instructions. Claude Code also has complete read-only agent definitions in [claude-agents](claude-agents/README.md). [Claude skills](https://code.claude.com/docs/en/skills), [official OpenAI skill documentation](https://learn.chatgpt.com/docs/build-skills).

For Claude Projects or another chat/knowledge tool, attach the canonical AGENT.md/GUIDE.md or copy its body. File upload, skill discovery and tool permissions vary by host; a plain prompt works without a skill system. See [skills setup](skills/README.md) for invocation and validation.

These files are distributions, not installed configuration for this extension repository. Install only in the project/private environment where you want PeopleSoft expertise.

## Cursor and plain chat

Complete on-demand rules are in [cursor-rules](cursor-rules/README.md); copy selected .mdc files to your target project's `.cursor/rules/`. Three original per-agent rule paths remain as complete exports for compatibility. For plain chat use one canonical definition plus sanitized task artifacts.

## Private pillar specialists

Use [local templates](local-templates/README.md) for HCM, FSCM and Campus Solutions. They contain module interview questions, evidence ledgers, working methods and synthetic acceptance cases. Copy outside this public repository, fill only confirmed local facts, and validate before installation. They are not preconfigured experts on your employer's records, roles or policies.

## Evidence and boundaries

- Generic/synthetic examples only; no credentials, telemetry or production data dumps.
- Read-only connector operations require authenticated, server-enforced policy; a row cap or SELECT privilege alone is insufficient.
- No inferred delivered keys, status fields, role names, trace IDs or PeopleCode row paths from browser IDs.
- Drafting fixes does not authorize production writes, process replay, security changes or deployment.
- Preserve intentional history and valid alternate SQL. Missing evidence is an uncertainty, not an automatic defect.
- [Sources](SOURCES.md), [authoring template](PROMPT-TEMPLATE.md), [sample requests](examples/README.md) and [behavioral evaluations](evaluations/README.md).

## Build, validate and distribute

```text
npm run generate:agents
npm run check:agents
npm run package:agents
```

Run these commands in a repository clone; a downloaded prompt ZIP is ready to copy into your chosen host. Edit canonical definitions and catalog metadata, then generate. Exports and README/wiki inventories must match exactly. Packaging validates links/catalog/export parity and includes only an explicit file list plus LICENSE/NOTICE, excluding private/untracked files. The ZIP uses the extension release number; content revision is independently recorded as 4.0.1.

[Browse source](https://github.com/hackmods/Morris-Peoplesoft-Utilities/tree/main/agents) · [release downloads](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/latest) · [wiki adoption guide](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/wiki/AI-Agent-Prompts.md).

## Contributing

Use review-/assist-/design-/guide- prefixes and [PROMPT-TEMPLATE.md](PROMPT-TEMPLATE.md). Add catalog metadata, sources, handoffs and at least one discriminating behavioral case; regenerate every host export. Keep local facts outside package inputs. Repository maintenance guidance is in [AGENTS.md](AGENTS.md); do not install that file as a user persona.
