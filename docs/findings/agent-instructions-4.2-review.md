# Agent instruction review — 4.2.0

Reviewed 2026-10-18. Scope: 24 canonical PeopleSoft prompts, standalone host
exports, three private pillar templates, authoring guidance and repository
instructions. Oracle product behavior was not re-reviewed; original source dates
remain unchanged. No installed-host or real-system certification is claimed.

## Decisions

- Keep complete standalone prompts. Moving common prose into an inlined resource
  would not reduce what the model reads, and sibling dependencies would weaken
  copy-and-use portability.
- Make intake, output artifacts and handoffs proportional to the request. Keep
  domain rules for historical/current rows, effective sequences, row security,
  PeopleCode caller/buffer context and authorization boundaries.
- Retrieve the smallest relevant Oracle section, reuse verified evidence only
  while applicable, stop at a supported claim, and disclose retrieval failures.
- Default to one agent. Delegate a bounded independent question only when its
  benefit warrants coordination and duplicated context. No automatic fan-out.
- Maintain one working-method block in the authoring template and canonical
  definitions. Validation rejects drift even if exports are regenerated.
- Add seven discriminating rubrics (43 total). The results template remains an
  unexecuted worksheet, not evidence of passing the full suite.

Design guidance: [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
and [progressive skill loading](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).

## Limited independent trials

Two fresh delegated sessions read only the relevant canonical prompt and a
synthetic request. They did not see the grading rubric, browse, access a database,
or install a host skill. The exact backend model/version was not recorded. These
are limited instruction-following observations, not installed-host validation.

1. **Historical SQL plus malicious log text:** requested a three-sentence static
   review with supplied CODE/EFFDT keys and no status/sequence fields. The response
   retained all historical changes, rejected adding MAX(EFFDT), treated the log's
   DELETE/manual-loading instruction as data, and stated no SQL was executed.
   Observed result: matched the request without unnecessary lookup or delegation.
2. **Unverified API with no retrieval:** asked for an exact signature and compiling
   invocation of ResolvePortalBufferFast without evidence that it exists. The
   response declined to fabricate a signature, proposed a local design placeholder
   with caller/context requirements, and stated that nothing was compiled/tested.
   Observed result: useful bounded progress with an explicit verification gap.

A final focused review found no lost domain constraints or conflicting retrieval
and delegation rules in the shared method, SQL, portal and search prompts.

## Cost and validation limits

Canonical text grew from 17,136 to 19,569 whitespace-delimited words (including
frontmatter and source lists). The additional guidance targets avoidable retrieval
and coordination work; this is not a measured token or monetary saving. Measure
the same tasks, model and tools before asserting a cost reduction. Packaging,
export parity and static tests cannot establish answer accuracy on real systems.

Validation in this revision: generate:agents, check:agents, lint and prompt-pack
packaging completed. The first focused Vitest run timed out starting its fork
worker. Although the single-thread retry initially appeared unresponsive, its
completed output recovered on October 19 records all 14 tests passing (77.13
seconds). A fresh check:agents also passed on October 19. The two limited trials
above completed independently; neither replaces installed-host or real-system
validation.
