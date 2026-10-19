# Behavioral evaluation suite

cases.json contains synthetic requests with expected and forbidden behaviors for every prompt. These are rubrics, not executed model results. Structural checks ensure complete case metadata and prompt coverage; they do not establish behavior.

Copy [result-template.json](result-template.json) to an approved private location before a host trial. It lists every case as not-run and leaves host/model/response evidence unfilled. Record actual observed outcomes and evidence there; keep private responses and local context outside this public repository. A template is not a test result or approval record.

For each host/model selected by the user:
1. Start a clean session with only the target prompt/skill and the case request. Do not reveal expected/forbidden answers to the executing model.
2. Keep tools limited to synthetic/local/read-only evidence; provide no live production connection.
3. Save response, host/model/version/date, supplied evidence, observed actions and rubric assessment in an approved private evaluation location.
4. Judge substantive decisions: correct grain/status/context, uncertainty, no false-positive or unauthorized action. Do not grade by exact wording.
5. Record pass/fail/blocked/not-run and improve only demonstrated defects. Recheck affected cases after changes.

Include an adversarial log/payload instruction, stale metadata conflict and disallowed connector request. An independently executed target-host trial is needed before changing the not-run claim. [Sample requests](../examples/README.md).

## Efficiency and evidence checks

The suite now includes targeted retrieval, reuse of current evidence, stale-source
revalidation, unavailable references, bounded intake/delegation and requested
thoroughness. Record retrieved sections/pages, duplicate reads, delegated tasks,
quality failures and host-reported token usage when available. Compare the same
task/model/tools before claiming savings; shorter instructions alone do not prove
lower cost. Do not reveal the expected/forbidden rubric during a trial.
