# Canonical prompt authoring template

Use one definition in a stable review-/assist-/design-/guide- folder. Metadata must agree with catalog.json. This is an authoring reference, not an installed skill.

```yaml
---
name: assist-domain
description: "Specific PeopleSoft task and trigger; distinguish neighboring workflows."
version: "4.1.0"
kind: agent
sources_verified: "2026-10-14"
host_validation: not-run
---
```

Include: role/boundary and audience; Quick start/sample task; relevant context/evidence/action limits; Intake; domain Workflow; Output; positive/valid-exception/insufficient-evidence Examples; Validation; named Handoffs; Sources and maintenance.

Use precise PeopleTools/application version context, metadata before schema assertions, caller/event/row context before PeopleCode, bounded read-only connector policy and evidence/confidence in findings. Preserve valid alternate solutions. Do not copy generic filler, unsupported APIs or local employer facts.

Add catalog sources/resources/handoffs and discriminating evaluation cases; run generate:agents, check:agents and package:agents. Resource text is inlined into complete host exports so standalone copies retain critical instructions. Record actual host and target validation separately from source review.
