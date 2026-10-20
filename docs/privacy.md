# Privacy Policy — Morris PeopleSoft Utilities

**Last updated:** 2026-10-19
**Publisher:** [hackmods](https://github.com/hackmods) (Ryan Morris)  
**Product:** Morris PeopleSoft Utilities (Chrome extension)

## Summary

Morris PeopleSoft Utilities (MPU) is a Manifest V3 Chrome extension that improves productivity on PeopleSoft Classic and Fluid pages. **MPU does not collect, transmit, sell, or share personal data with the developer or any third party.**

## Data stored on your device

Settings are stored only in Chrome’s `chrome.storage.local` on your profile, including:

- Feature on/off preferences
- Agent library favorite IDs, up to six recently opened/prepared agent IDs, and welcome-message dismissal (no task briefs or searches)
- Favorites (may include menu/component names and optional URL parameters)
- The last 12 component identifiers visited for recent shortcuts (not full browsing history)
- Customization watch notes and dated baseline UI fingerprints (field IDs, tab/structure labels, component identifiers, environment/origin-site scope and detected Tools version); up to five per component/environment and 50 overall
- Optional **Field Entry** named profiles (field values you choose to save; may include business keys such as EmplIDs or department IDs — never passwords; session clipboard is not persisted)
- Environment labels and URL/site mappings
- Trace flag preferences and last-request evidence (origin/site scope, target, timestamp and save-request outcome), which does not establish current server/session trace state
- Optional host allowlist origins (Phase 2, off by default)

## Data MPU does not collect

- No passwords or login credentials
- No analytics, advertising, or telemetry
- No remote configuration servers operated by MPU
- No account required to use the extension

## Network activity

MPU's authenticated feature requests go **only to the PeopleSoft site you are already using** (same origin/session), for example to toggle delivered PeopleCode/SQL trace components when you click Trace. Those requests use your existing authenticated PeopleSoft session cookies. MPU never sends that traffic to hackmods or other third parties.

The Agents reference library is a packaged catalog of public PeopleSoft prompts. Rendering or searching it makes no external requests and does not retain your search. Prepare task brief creates a blank editable request; it does not read the active page or save your edits. Copy task brief writes only that displayed text to your clipboard when requested. When you choose a documentation or release link, Chrome opens the public GitHub page in a new tab. Those links omit referrer information and contain no PeopleSoft page URL, field values, business keys or session tokens. GitHub handles that ordinary page visit under its own policies.

MPU does not execute these agents, connect to an AI service or upload PeopleSoft data to Copilot, Claude, Codex or another provider. If you later copy information into your chosen AI tool, that sharing is controlled by you and your organization's policy, outside MPU.

## Page access, clipboard and exports

MPU reads relevant PeopleSoft page content locally to display the signed-in user ID, page/system metadata, field identities, process details and Integration Broker context. Field Entry, when enabled, reads editable values into memory and writes reviewed values back to the open page; those values may be personal or business data. It does not automatically save the PeopleSoft transaction. The normal PeopleSoft field-change processing and subsequent user save may send changes to your PeopleSoft server.

Copy and export actions put the selected information in your clipboard or a downloaded file. Settings backups include recent components, saved profiles and watch notes. You control those files and any later sharing; MPU does not upload them. Compare clipboard actions read text only when requested.

## Retention and deletion

Preview diagnostics builds an allowlisted local configuration summary without page/field values, hostnames, user IDs, object names or session tokens. You can review/edit it before explicitly copying or downloading it. The preview is not saved or uploaded. Upgrade handoffs are likewise previewed local text and may contain technical component/field names; review them before sharing. Files and clipboard contents remain under your control after export.

The Field Entry session buffer lasts until cleared, disabled, or the page unloads. Saved preferences, favorites, profiles and watch baselines remain in local extension storage until removed or replaced through Options, or the extension is uninstalled. Uninstalling does not remove files you exported or clear your operating system clipboard.

MPU's use of browser/page data is limited to its disclosed PeopleSoft productivity features and complies with the Chrome Web Store User Data Policy, including Limited Use restrictions. It does not use data for advertising or provide developer access to local records.

## Permissions

- **storage** — save preferences locally
- **sidePanel** — optional Side Panel UI for Favorites, Page Info and the local Agents library (opened from the popup or toolbar)
- **tabs** — read the active tab URL to validate PeopleSoft navigation context for the Side Panel. Navigation and Page Info messaging use that tab; MPU does not store unrelated tab URLs or browsing history.

Content scripts run only on PeopleSoft URL patterns (`psp` / `psc` servlet paths).

## Host allowlist (optional)

By default MPU matches PeopleSoft URL patterns on any host (parity with classic PS Utilities). You may enable an **opt-in host allowlist** in Options to disable MPU features on origins outside the list. This is an application-level guard: Chrome still grants the manifest's pattern-scoped content-script access. Use Chrome's extension site-access controls to restrict browser-level access.

## Children’s privacy

MPU is intended for workplace/education PeopleSoft users and does not target children.

## Contact

Questions or privacy requests: open an issue at  
https://github.com/hackmods/Morris-Peoplesoft-Utilities/issues

## Changes

Material changes to this policy will be reflected in this document and noted in the project CHANGELOG.
