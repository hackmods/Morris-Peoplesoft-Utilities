# ADR 0009: PeopleSoft agent reference library

## Status

Accepted — 2026-10-14. Chrome Web Store approval remains an external review outcome.

## Context

The separate PeopleSoft prompt pack supports the same BA/developer productivity focus as MPU. Users need a discoverable task chooser and setup links. Full prompts and host skills remain a separate distribution.

## Decision

Options → Agents contains a locally bundled public reference catalog generated from agents/catalog.json: ID, title, description, kind and source path, plus three generic template references and content version. Search/filtering is local and ephemeral. Popup/side-panel links open this extension page; existing Help links to the public toolkit.

Links are fixed public GitHub paths with noopener/noreferrer and no-referrer. They contain no page context, business keys, field values or session tokens. Rendering makes no remote requests. No AI execution, remote prompt fetch, model/API connection, automatic page export or new permissions are introduced. Host restrictions continue to govern the injected bar; standalone documentation does not read an active PeopleSoft tab.

## Policy reasoning

Google permits multiple functions related to a narrow subject matter under its [single-purpose guidance](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq). This reference feature is ancillary to MPU's existing PeopleSoft tools rather than the extension's sole utility; see [minimum functionality](https://developer.chrome.com/docs/webstore/program-policies/minimum-functionality).

MV3 requires discernible, self-contained extension logic and prohibits interpreting remotely fetched commands as extension behavior. This feature displays bundled metadata and opens documentation; it does not execute external prompt/code content. See [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements). This is a policy interpretation, not a guarantee of acceptance.

Privacy and listing copy disclose local references versus the user's independent use of an AI provider. Any future feature that executes AI instructions, sends page data or connects services requires its own design/policy/data-use review and explicit task authorization.

## Consequences and validation

Catalog/export checks detect stale metadata. Browser regressions cover local filtering without requests/storage changes, deep links, light/dark/narrow rendering, keyboard tabs and Help focus return with rendered axe contrast checks. Full prompts, skills and private filled templates stay out of the extension ZIP. Synthetic checks do not establish real PeopleTools compatibility or accessibility conformance.
