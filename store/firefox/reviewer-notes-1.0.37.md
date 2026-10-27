# Firefox review notes — 1.0.37

This shared Chrome/Firefox update simplifies the local Scheduler, Integration
Broker, configuration comparison and Trace SQL workspaces into three consistent
steps: choose sources, preview/investigate, and review/export. Detailed limits
and optional evidence use native keyboard-accessible disclosures. Sanitization,
local-only behavior and unsupported native-format boundaries stay visible.
Empty report areas are compact; review checkboxes align with their labels.

Parser grammars, file limits, capture rules, permissions and storage schemas do
not change. Selection alone reads nothing. Changed inputs invalidate preview
approval/export; clear/reload removes session evidence. Trace SQL's existing
charts, groups and raw-source explorer expand explicitly after preview. The
prior PDF/Agents race and Trace SQL parse-result repairs remain included.

Build matching committed source using Node 22.22.2+ within 22.x, 24.15+ within
24.x, or 26+: `npm ci`, then `npm run build:firefox` (output `dist/firefox/`).
`npm run build` builds both browsers and checks shared runtime parity. Public
agent toolkit sources support metadata validation; full prompts are not shipped.
No service credentials or proprietary libraries are needed.

The plan and outcomes are in `docs/findings/investigation-usability-plan.md`.
Browser journeys use explicitly synthetic files and disposable profiles.
Public Niagara Careers showed an MPU toolbar, but installed build/Tools patch
and administrative compatibility were not established. Public recruitment pages
do not supply Scheduler logs, IB artifacts or configuration pairs. These tests
are not native-file or real PeopleTools patch certification.

Firefox validation retains zero errors and the existing 11 warnings: one Android
consent-floor warning (desktop support only), and five dynamic-template sites
repeated in content/shared bundles. Attribute/text escaping is retained in
favorites-ui.ts/field-entry-ui.ts; bar.ts uses fixed markup and textContent for
page-derived labels. Source maps remain included. No warnings or CSP checks are
suppressed, and no new permission, AI endpoint or telemetry is introduced.
