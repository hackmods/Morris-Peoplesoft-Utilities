// Generated from agents/catalog.json. Run npm run generate:agents; do not edit.
export const AGENT_PACK_VERSION = "4.2.0";
export const AGENT_REFERENCES = [
  {
    "id": "assist-admin-diagnostics",
    "title": "PeopleSoft administration diagnostics advisor",
    "description": "Triage PeopleSoft PIA, web/application domains, Process Scheduler and IB boundaries using sanitized logs and configuration evidence.",
    "kind": "agent",
    "source": "assist-admin-diagnostics/AGENT.md",
    "audience": "PeopleSoft admin, operations support"
  },
  {
    "id": "assist-application-engine",
    "title": "Application Engine batch specialist",
    "description": "Design and troubleshoot PeopleSoft AE programs, state records, temporary tables, commit/restart boundaries and concurrent execution.",
    "kind": "agent",
    "source": "assist-application-engine/AGENT.md",
    "audience": "Batch developer, admin"
  },
  {
    "id": "assist-approval-framework",
    "title": "PeopleSoft Approval Framework advisor",
    "description": "Design and troubleshoot PeopleSoft approval routing, participant resolution, delegation, escalation and transaction controls.",
    "kind": "agent",
    "source": "assist-approval-framework/AGENT.md",
    "audience": "BA, functional consultant, approval developer"
  },
  {
    "id": "assist-fluid",
    "title": "PeopleSoft Fluid design and troubleshooting specialist",
    "description": "Design and troubleshoot PeopleSoft Fluid components, layouts, search, tiles, navigation collections and modal behavior.",
    "kind": "agent",
    "source": "assist-fluid/AGENT.md",
    "audience": "Fluid developer, BA, portal admin"
  },
  {
    "id": "assist-integrations",
    "title": "PeopleSoft Integration Broker and CI specialist",
    "description": "Design and troubleshoot PeopleSoft IB and Component Interfaces, including security, CI event timing, error collections and safe replay.",
    "kind": "agent",
    "source": "assist-integrations/AGENT.md",
    "audience": "Integration developer, admin, BA"
  },
  {
    "id": "assist-peoplecode",
    "title": "PeopleCode solution author",
    "description": "Draft PeopleCode and application-class solutions with explicit caller, event, buffer context, dependencies and validation.",
    "kind": "agent",
    "source": "assist-peoplecode/AGENT.md",
    "audience": "PeopleSoft developer"
  },
  {
    "id": "assist-performance-trace",
    "title": "PeopleSoft performance and trace analyst",
    "description": "Analyze scrubbed PeopleSoft SQL, PeopleCode and AE traces, timings, plans and lock evidence; design bounded diagnostic capture.",
    "kind": "agent",
    "source": "assist-performance-trace/AGENT.md",
    "audience": "Developer, DBA, admin"
  },
  {
    "id": "assist-portal-branding",
    "title": "PeopleSoft portal and branding specialist",
    "description": "Design and troubleshoot PeopleSoft portal registry navigation, CREFs, homepages, tiles and branding themes with verified configuration and rendered evidence.",
    "kind": "agent",
    "source": "assist-portal-branding/AGENT.md",
    "audience": "Portal administrator, Fluid developer, UX designer, BA"
  },
  {
    "id": "assist-process-scheduler",
    "title": "Process Scheduler operations analyst",
    "description": "Triage PeopleSoft process execution, run controls, scheduling dependencies and report distribution from sanitized monitor evidence.",
    "kind": "agent",
    "source": "assist-process-scheduler/AGENT.md",
    "audience": "Admin, BA, batch support"
  },
  {
    "id": "assist-reporting",
    "title": "PeopleSoft reporting specialist",
    "description": "Design and troubleshoot BI Publisher, Query/Connected Query and existing SQR report data, templates, reconciliation and distribution.",
    "kind": "agent",
    "source": "assist-reporting/AGENT.md",
    "audience": "BA, reporting analyst, developer"
  },
  {
    "id": "assist-schema-mcp",
    "title": "PeopleSoft schema and bounded data assistant",
    "description": "Inspect authorized PeopleSoft record metadata and bounded read-only samples through a mapped connector or sanitized pasted definitions.",
    "kind": "agent",
    "source": "assist-schema-mcp/AGENT.md",
    "audience": "BA, developer, reporting analyst"
  },
  {
    "id": "assist-search-framework",
    "title": "PeopleSoft Search Framework specialist",
    "description": "Design and troubleshoot PeopleSoft Search Framework definitions, indexing, search security and result behavior using verified metadata and sanitized evidence.",
    "kind": "agent",
    "source": "assist-search-framework/AGENT.md",
    "audience": "Search administrator, PeopleSoft developer, BA, security analyst"
  },
  {
    "id": "assist-sql-query",
    "title": "PeopleSoft SQL and Query author",
    "description": "Draft or improve PeopleSoft Query, AE, view and PeopleCode SQL using known metadata, explicit result grain and supported syntax.",
    "kind": "agent",
    "source": "assist-sql-query/AGENT.md",
    "audience": "BA, reporting analyst, developer"
  },
  {
    "id": "assist-sqlid-fingerprint",
    "title": "PeopleSoft tracesql SQLID and fingerprint explainer",
    "description": "Explain PeopleSoft tracesql SQL grouping using statement text the user already has: MPU SQLID encoding versus the MPU-only FNV fingerprint, including collisions.",
    "kind": "agent",
    "source": "assist-sqlid-fingerprint/AGENT.md",
    "audience": "Developer, DBA, admin reviewing MPU report IDs"
  },
  {
    "id": "assist-tracesql-ae-bridge",
    "title": "PeopleSoft AE and tracesql correlation",
    "description": "Correlate a sanitized Application Engine step excerpt with a sanitized PeopleSoft tracesql excerpt using clean-room markers; hand AE restart questions to assist-application-engine.",
    "kind": "agent",
    "source": "assist-tracesql-ae-bridge/AGENT.md",
    "audience": "Developer, DBA, AE support, admin"
  },
  {
    "id": "assist-tracesql-hotspots",
    "title": "PeopleSoft tracesql hotspot analyst",
    "description": "Triage sanitized PeopleSoft .tracesql/.trc excerpts using clean-room COM STMT/Dur=/PeopleCode markers; rank SQL and PeopleCode hotspots without proprietary desktop binaries.",
    "kind": "agent",
    "source": "assist-tracesql-hotspots/AGENT.md",
    "audience": "Developer, DBA, admin, BA supporting performance tickets"
  },
  {
    "id": "assist-tracesql-sanitize",
    "title": "PeopleSoft tracesql sanitization coach",
    "description": "Coach redaction of binds, PII, host paths and tokens in PeopleSoft tracesql excerpts or MPU Trace SQL reports before any AI paste.",
    "kind": "agent",
    "source": "assist-tracesql-sanitize/AGENT.md",
    "audience": "Developer, DBA, admin, BA supporting performance tickets"
  },
  {
    "id": "design-component",
    "title": "PeopleSoft component design advisor",
    "description": "Plan PeopleSoft component, search, record and scroll structures across Classic and Fluid with security, history and upgrade tradeoffs.",
    "kind": "agent",
    "source": "design-component/AGENT.md",
    "audience": "BA, solution designer, developer"
  },
  {
    "id": "design-data-conversion",
    "title": "PeopleSoft data conversion designer",
    "description": "Plan PeopleSoft conversion mappings, staging, supported load interfaces, rejects, reconciliation, restart and cutover.",
    "kind": "agent",
    "source": "design-data-conversion/AGENT.md",
    "audience": "Conversion BA, developer, data owner"
  },
  {
    "id": "design-functional-requirements",
    "title": "PeopleSoft functional requirements designer",
    "description": "Develop PeopleSoft BA requirements, process maps, configuration fit/gap, business rules and testable acceptance criteria.",
    "kind": "agent",
    "source": "design-functional-requirements/AGENT.md",
    "audience": "BA, functional consultant, product owner"
  },
  {
    "id": "design-test-uat",
    "title": "PeopleSoft testing and UAT designer",
    "description": "Create traceable PeopleSoft unit, integration, security, UAT and upgrade regression plans, including PTF where suitable.",
    "kind": "agent",
    "source": "design-test-uat/AGENT.md",
    "audience": "BA, tester, developer, release owner"
  },
  {
    "id": "guide-onboarding",
    "title": "PeopleSoft onboarding mentor",
    "description": "Teach PeopleSoft concepts and safe first tasks for BAs, developers and administrators with pillar-specific learning routes.",
    "kind": "agent",
    "source": "guide-onboarding/AGENT.md",
    "audience": "New BA, developer, admin, reporting analyst"
  },
  {
    "id": "guide-specialist-trainer",
    "title": "Local PeopleSoft specialist builder",
    "description": "Create and maintain private HCM, FSCM or Campus Solutions specialists from verified local definitions, policies, incidents and acceptance cases.",
    "kind": "guide",
    "source": "guide-specialist-trainer/GUIDE.md",
    "audience": "Functional/technical owner, team mentor"
  },
  {
    "id": "guide-tracesql-literacy",
    "title": "PeopleSoft tracesql literacy guide",
    "description": "Teach PeopleSoft tracesql marker literacy using synthetic .tracesql excerpts only; not a PeopleTools patch proof or Trace Magic product guide.",
    "kind": "guide",
    "source": "guide-tracesql-literacy/GUIDE.md",
    "audience": "Developer, DBA, admin, BA learning performance tickets"
  },
  {
    "id": "review-data-correctness",
    "title": "PeopleSoft data correctness reviewer",
    "description": "Review existing PeopleSoft SQL, Query, PeopleCode SQL, AE or SQR for result grain, effective dating, keys, joins and data sources.",
    "kind": "agent",
    "source": "review-data-correctness/AGENT.md",
    "audience": "Developer, BA, reporting analyst"
  },
  {
    "id": "review-fluid-accessibility",
    "title": "PeopleSoft Fluid and Classic accessibility reviewer",
    "description": "Review rendered PeopleSoft Fluid and Classic tasks for keyboard, focus, semantics, errors, contrast, zoom and assistive-technology barriers.",
    "kind": "agent",
    "source": "review-fluid-accessibility/AGENT.md",
    "audience": "Tester, accessibility specialist, BA, UI developer"
  },
  {
    "id": "review-peoplecode-quality",
    "title": "PeopleCode quality reviewer",
    "description": "Review PeopleCode APIs, SQL construction, buffer access, event placement, error handling and reusable application classes.",
    "kind": "agent",
    "source": "review-peoplecode-quality/AGENT.md",
    "audience": "PeopleSoft developer"
  },
  {
    "id": "review-security",
    "title": "PeopleSoft security reviewer",
    "description": "Review effective PeopleSoft page, row, Query, process, CI and integration access and evidence-based segregation of duties.",
    "kind": "agent",
    "source": "review-security/AGENT.md",
    "audience": "Security admin, BA, auditor, developer"
  },
  {
    "id": "review-tracesql-report",
    "title": "MPU Trace SQL report reviewer",
    "description": "Critique an MPU Trace SQL investigation report for double-counted durations, missing unknowns, SQLID versus fingerprint overclaim, and sanitization gaps.",
    "kind": "agent",
    "source": "review-tracesql-report/AGENT.md",
    "audience": "Developer, DBA, admin, BA reviewing a local Options export"
  },
  {
    "id": "review-upgrade-migration",
    "title": "PeopleSoft upgrade and migration reviewer",
    "description": "Review PeopleTools/application updates, object compares, customization impact and controlled object/configuration migration plans.",
    "kind": "agent",
    "source": "review-upgrade-migration/AGENT.md",
    "audience": "Release owner, admin, developer, BA"
  }
] as const;
export const LOCAL_SPECIALIST_REFERENCES = [
  {
    "id": "hcm",
    "title": "HCM local specialist",
    "source": "local-templates/hcm/SKILL.md"
  },
  {
    "id": "fscm",
    "title": "FSCM local specialist",
    "source": "local-templates/fscm/SKILL.md"
  },
  {
    "id": "campus-solutions",
    "title": "Campus Solutions local specialist",
    "source": "local-templates/campus-solutions/SKILL.md"
  }
] as const;
