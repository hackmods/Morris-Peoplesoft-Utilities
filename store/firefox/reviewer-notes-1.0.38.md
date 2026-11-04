# Firefox review notes — 1.0.38

This shared Chrome/Firefox update includes the merged toolbar, field-inspector
and recent-visit fixes after the approved 1.0.37 build. The default toolbar uses
Find page, Find field and More; specialist actions are grouped under More with
keyboard navigation and focus return. Field lookup searches the current page
and same-origin frames. Inspector markers preserve the underlying page layout.
Recent-visit writes remain independent of settings refresh across tabs.

No new permissions, remote code, AI endpoint or telemetry are introduced.
Existing host/environment/feature guards and Fluid save-warning protections
remain in place. Privacy disclosures are unchanged.

Build the attached matching source with Node 22.22.2+ within 22.x, 24.15+ within
24.x, or 26+: `npm ci`, then `npm run build:firefox` (output `dist/firefox/`).
`npm run build` builds both browsers and checks shared runtime parity. Public
agent toolkit sources support metadata validation; full prompts are not shipped.
No service credentials or proprietary libraries are needed.

Browser tests use synthetic PeopleSoft fixtures and disposable profiles.
They do not establish real PeopleTools 8.62 patch-level compatibility or
accessibility conformance. Real-system verification remains separately tracked
in `docs/testing/peopletools-8.62.md`.

Firefox validation retains the documented Android consent-floor warning
(desktop support only) and dynamic-template warnings. Source maps are included;
no warnings or CSP checks are suppressed.
