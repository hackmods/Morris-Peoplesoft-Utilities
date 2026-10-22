# AI agent prompts for PeopleSoft work

The [PeopleSoft prompt pack](https://github.com/hackmods/Morris-Peoplesoft-Utilities/tree/main/agents) is a separate toolkit, outside the Chrome extension. Content v4.2.0 includes 30 complete prompts, three private-tailoring templates and an unexecuted evaluation-results worksheet. Target PeopleTools 8.62; confirm application release/PUM separately.

## Adoption

For Visual Studio/VS Code Copilot, copy selected complete .prompt.md files from agents/vscode-prompts into your PeopleSoft solution's .github/prompts and invoke from the supported prompt/context picker. For Claude Code skills copy selected agents/skills/ps-* directories to .claude/skills; for Codex use .agents/skills. Claude read-only agent exports and Cursor rules are also included. Plain Markdown can be attached to other chat/knowledge tools.

Full [setup, workflow routes and validation instructions](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/README.md). [Microsoft Visual Studio](https://learn.microsoft.com/en-us/visualstudio/ide/copilot-chat-context?view=vs-2022), [Claude skills](https://code.claude.com/docs/en/skills), [official OpenAI skills](https://learn.chatgpt.com/docs/build-skills).

## Catalog

<!-- CATALOG-BEGIN -->

| Prompt | Kind | Use |
|---|---|---|
| [assist-admin-diagnostics](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-admin-diagnostics/AGENT.md) | agent | Triage PeopleSoft PIA, web/application domains, Process Scheduler and IB boundaries using sanitized logs and configuration evidence. |
| [assist-application-engine](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-application-engine/AGENT.md) | agent | Design and troubleshoot PeopleSoft AE programs, state records, temporary tables, commit/restart boundaries and concurrent execution. |
| [assist-approval-framework](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-approval-framework/AGENT.md) | agent | Design and troubleshoot PeopleSoft approval routing, participant resolution, delegation, escalation and transaction controls. |
| [assist-fluid](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-fluid/AGENT.md) | agent | Design and troubleshoot PeopleSoft Fluid components, layouts, search, tiles, navigation collections and modal behavior. |
| [assist-integrations](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-integrations/AGENT.md) | agent | Design and troubleshoot PeopleSoft IB and Component Interfaces, including security, CI event timing, error collections and safe replay. |
| [assist-peoplecode](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-peoplecode/AGENT.md) | agent | Draft PeopleCode and application-class solutions with explicit caller, event, buffer context, dependencies and validation. |
| [assist-performance-trace](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-performance-trace/AGENT.md) | agent | Analyze scrubbed PeopleSoft SQL, PeopleCode and AE traces, timings, plans and lock evidence; design bounded diagnostic capture. |
| [assist-portal-branding](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-portal-branding/AGENT.md) | agent | Design and troubleshoot PeopleSoft portal registry navigation, CREFs, homepages, tiles and branding themes with verified configuration and rendered evidence. |
| [assist-process-scheduler](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-process-scheduler/AGENT.md) | agent | Triage PeopleSoft process execution, run controls, scheduling dependencies and report distribution from sanitized monitor evidence. |
| [assist-reporting](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-reporting/AGENT.md) | agent | Design and troubleshoot BI Publisher, Query/Connected Query and existing SQR report data, templates, reconciliation and distribution. |
| [assist-schema-mcp](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-schema-mcp/AGENT.md) | agent | Inspect authorized PeopleSoft record metadata and bounded read-only samples through a mapped connector or sanitized pasted definitions. |
| [assist-search-framework](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-search-framework/AGENT.md) | agent | Design and troubleshoot PeopleSoft Search Framework definitions, indexing, search security and result behavior using verified metadata and sanitized evidence. |
| [assist-sql-query](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-sql-query/AGENT.md) | agent | Draft or improve PeopleSoft Query, AE, view and PeopleCode SQL using known metadata, explicit result grain and supported syntax. |
| [assist-sqlid-fingerprint](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-sqlid-fingerprint/AGENT.md) | agent | Explain PeopleSoft tracesql SQL grouping using statement text the user already has: MPU SQLID encoding versus the MPU-only FNV fingerprint, including collisions. |
| [assist-tracesql-ae-bridge](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-tracesql-ae-bridge/AGENT.md) | agent | Correlate a sanitized Application Engine step excerpt with a sanitized PeopleSoft tracesql excerpt using clean-room markers; hand AE restart questions to assist-application-engine. |
| [assist-tracesql-hotspots](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-tracesql-hotspots/AGENT.md) | agent | Triage sanitized PeopleSoft .tracesql/.trc excerpts using clean-room COM STMT/Dur=/PeopleCode markers; rank SQL and PeopleCode hotspots without proprietary desktop binaries. |
| [assist-tracesql-sanitize](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/assist-tracesql-sanitize/AGENT.md) | agent | Coach redaction of binds, PII, host paths and tokens in PeopleSoft tracesql excerpts or MPU Trace SQL reports before any AI paste. |
| [design-component](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/design-component/AGENT.md) | agent | Plan PeopleSoft component, search, record and scroll structures across Classic and Fluid with security, history and upgrade tradeoffs. |
| [design-data-conversion](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/design-data-conversion/AGENT.md) | agent | Plan PeopleSoft conversion mappings, staging, supported load interfaces, rejects, reconciliation, restart and cutover. |
| [design-functional-requirements](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/design-functional-requirements/AGENT.md) | agent | Develop PeopleSoft BA requirements, process maps, configuration fit/gap, business rules and testable acceptance criteria. |
| [design-test-uat](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/design-test-uat/AGENT.md) | agent | Create traceable PeopleSoft unit, integration, security, UAT and upgrade regression plans, including PTF where suitable. |
| [guide-onboarding](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/guide-onboarding/AGENT.md) | agent | Teach PeopleSoft concepts and safe first tasks for BAs, developers and administrators with pillar-specific learning routes. |
| [guide-specialist-trainer](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/guide-specialist-trainer/GUIDE.md) | guide | Create and maintain private HCM, FSCM or Campus Solutions specialists from verified local definitions, policies, incidents and acceptance cases. |
| [guide-tracesql-literacy](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/guide-tracesql-literacy/GUIDE.md) | guide | Teach PeopleSoft tracesql marker literacy using synthetic .tracesql excerpts only; not a PeopleTools patch proof or Trace Magic product guide. |
| [review-data-correctness](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-data-correctness/AGENT.md) | agent | Review existing PeopleSoft SQL, Query, PeopleCode SQL, AE or SQR for result grain, effective dating, keys, joins and data sources. |
| [review-fluid-accessibility](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-fluid-accessibility/AGENT.md) | agent | Review rendered PeopleSoft Fluid and Classic tasks for keyboard, focus, semantics, errors, contrast, zoom and assistive-technology barriers. |
| [review-peoplecode-quality](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-peoplecode-quality/AGENT.md) | agent | Review PeopleCode APIs, SQL construction, buffer access, event placement, error handling and reusable application classes. |
| [review-security](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-security/AGENT.md) | agent | Review effective PeopleSoft page, row, Query, process, CI and integration access and evidence-based segregation of duties. |
| [review-tracesql-report](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-tracesql-report/AGENT.md) | agent | Critique an MPU Trace SQL investigation report for double-counted durations, missing unknowns, SQLID versus fingerprint overclaim, and sanitization gaps. |
| [review-upgrade-migration](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/review-upgrade-migration/AGENT.md) | agent | Review PeopleTools/application updates, object compares, customization impact and controlled object/configuration migration plans. |

<!-- CATALOG-END -->

## Local pillar specialists

HCM, FSCM and Campus Solutions templates include module questions, evidence ledgers, local working methods and acceptance cases. Tailor privately with verified definitions/policies. Never commit site-specific records, hosts, roles or personal data to the public pack. Use guide-specialist-trainer to establish owners, source dates and revalidation.

## Confidence and distribution

Source review and deterministic export/package checks do not prove model behavior or PeopleTools compatibility. Host and real-system trials remain not run. The schema contract describes placeholder read-only tools, not an implemented connector. Database policy must enforce access, projections, limits and environment identity.

Download morris-peoplesoft-agents-v*.zip from [GitHub Releases](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/latest), or run npm run package:agents locally. Each prompt contains complete instructions; no manual paste-into-stub step remains.
