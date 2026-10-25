# Privacy Policy — Morris PeopleSoft Utilities

**Last updated:** 2026-10-22
**Publisher:** [hackmods](https://github.com/hackmods) (Ryan Morris)  
**Product:** Morris PeopleSoft Utilities (Chrome and Firefox extension)

## Summary

Morris PeopleSoft Utilities (MPU) is a Manifest V3 extension for Chrome and Firefox that improves productivity on PeopleSoft Classic and Fluid pages. **MPU does not collect, transmit, sell, or share personal data with the developer or any third party.**

## Data stored on your device

Settings are stored only in extension-local storage (`chrome.storage.local` in Chrome, `browser.storage.local` in Firefox) in your browser profile. Each browser keeps its own data; MPU does not sync settings between browsers. This includes:

- Feature on/off preferences
- Agent library favorite IDs, up to six recently opened/prepared agent IDs, and welcome-message dismissal (no task briefs or searches)
- Favorites (may include menu/component names and optional URL parameters)
- The last 12 component identifiers visited for recent shortcuts (not full browsing history)
- Customization watch notes and dated baseline UI fingerprints (field IDs, tab/structure labels, component identifiers, environment/origin-site scope and detected Tools version); up to five per component/environment and 50 overall
- Optional **Field Entry** named profiles (field values you choose to save; may include business keys such as EmplIDs or department IDs — never passwords; session clipboard is not persisted)
- Environment labels, explicit production/non-production classification and URL/site mappings
- Environment runbooks in a separate local key: manually entered environment/component labels, titles, notes, approved HTTPS links and update timestamps (up to 100 entries and a 256,000-byte serialized cap)
- Explicitly reviewed environment snapshots and saved comparisons in a separate local key: field identifiers and UI labels, portal/target origins and sites, environment labels, dates, extension/Tools/application version metadata and capture warnings. Up to 50 snapshots and 25 comparison records, within a 1,000,000-byte serialized cap; comparison records retain their own two snapshot copies
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

Scheduler investigations read explicitly selected sanitized excerpts only after Preview, plus optional ticket text and case findings you enter. Integration Broker investigations use manually prepared records or explicitly selected versioned JSON envelopes; optional JSON/XML payload-file reads require a separate button. Raw files, drafts, case notes, selected comparisons/process focus and reports remain in the Options tab's memory. They are not stored, backed up, transmitted or automatically attached from PeopleSoft pages. Clear, page exit or reload removes that work. Source changes retain typed findings with instructions to recheck their scope/citations and invalidate export approval. Conservative masking cannot find every secret or business identifier; sanitize inputs and review all remaining content before explicitly copying/downloading. Source filenames are omitted. Exported files and clipboard contents remain under your control. MPU does not replay, resubmit, cancel or verify server operations through these workspaces.

PCode context preparation keeps the verified names, event, row-context description and example in dialog memory only. The extension does not inspect server PeopleCode, execute generated examples or send them to an AI service. Reference buttons open fixed local destinations; only a bounded PeopleTools version hint can accompany the documentation destination.

Configuration comparison reads only the two files you explicitly select, after you request a preview. Raw file content, parsed entries and reports remain in that Options tab's memory; they are not saved in extension storage, backed up or transmitted. Clear the workspace or reload to remove selections and reports. Sanitize files before selecting them: conservative masking cannot detect all secrets or business identifiers. Masked pairs are not compared. Source filenames are omitted. Copy/download is available only after reviewing the preview and checking its review box. Exported files and clipboard contents remain under your control after clearing or uninstalling.

Trace SQL investigations read one or two explicitly selected sanitized `.tracesql` / `.trc` files or an optional paste only after Preview. The file/paste, parsed hotspots, grouping tables, charts, occurrence dialogs and report stay in that Options tab's memory; they are not stored, backed up or transmitted. Cancel, Clear, page exit or reload resets the workspace; a cancelled parse leaves no partial report. Source filenames are omitted from the report (the tab may show the selected name in status only). Trace files often contain binds and business keys — sanitize first and review every unmasked SQL/error line before enabling copy/download of the full report or SQL-only statements. Exported files and clipboard contents remain under your control after clearing or uninstalling.

Environment comparison snapshots are prepared only when you choose the Page Info action, and are saved only after review. They exclude field values and full page/session URLs. Snapshot labels, technical UI labels and origins may contain business context. Two snapshots must be selected explicitly for a report; copy/download requires a visible reviewed report. MPU does not upload comparison data or automatically retrieve other environments. Delete source snapshots and saved comparisons separately in Options → Compare environments: deleting a source snapshot does not remove the copy retained in an existing saved comparison. These records are separate from the settings backup; downloaded reports remain under your control after deletion or uninstall.

Runbooks do not read the active PeopleSoft page or automatically fetch their links. Choosing a saved HTTPS link opens that destination without a referrer or added page context; the destination handles the ordinary visit under its own policies. Team runbook imports are previewed locally before saving, and exports are separate files that may contain business context. MPU does not upload runbooks. Delete individual entries in Options → Environments; uninstalling removes their local extension storage but does not remove exported files.

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

## Documentation hub and guided intake

Options and the side panel include a local catalog of official Oracle manual titles, topics and public links. Search, Tools-version selection and application-family selection are not stored. Favorite manual IDs and last-opened timestamps are stored locally, independently of settings; no PDF contents or external browsing history are collected. Links open only on explicit selection with no referrer. Nothing is fetched for an AI model automatically.

Guided agent handoffs contain only information you type. The form and editable preview remain in page memory and are not saved. Copying is explicit. MPU does not redact pasted evidence or send it to an AI service.

The Fluid navigation debugger collects bounded structural frame/modal clues only on request. Its diagnostic omits page text, field values, arbitrary identifiers, tokens and URLs; it does not inspect server state or determine whether a transaction has unsaved changes. Popup activation status uses a boolean response, not a page snapshot. The extension does not intercept network traffic.
