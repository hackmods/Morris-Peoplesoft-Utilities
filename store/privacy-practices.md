# Chrome Web Store — Privacy practices answers

Use these answers in the Developer Dashboard. They must match `docs/privacy.md` and actual extension behavior.

## Single purpose

Increase productivity on PeopleSoft Classic and Fluid pages for business analysts and technical users (favorites, page metadata, search helpers, optional tracing/field inspection).

The Agents reference library supports that purpose with local search of reusable PeopleSoft prompt descriptions and user-selected public GitHub documentation/release links. It provides no general chatbot, AI service connection or automatic data transfer.

Agent favorites, up to six recent reference IDs and welcome dismissal are stored locally in a separate preference key. Search queries and editable task briefs are not saved. Opening the Agents view does not request a PeopleSoft page snapshot.

Previewed diagnostics contains an allowlisted configuration summary and is copied/downloaded only by the user. Upgrade histories and trace request evidence stay in local storage. No diagnostic or handoff report is automatically uploaded or shared with the developer.

## Does this extension collect or use user data?

**Local data use; no developer-side collection.** MPU reads PeopleSoft website content for its visible features and stores preferences, favorites, recent component identifiers, customization fingerprints/notes, and optional Field Entry profiles locally. Do not interpret “no telemetry” as “no access to user data.”

For Dashboard data-use categories, disclose website content and the applicable personal/business data handled by the listed features. Page Info can display a user ID; optional profiles can contain personal field values. Recent components are a limited local navigation history. Reconcile the current Dashboard wording with these actual uses and the privacy policy; do not select “none” solely because nothing is sent to the developer.

## Remote code

No. All code is packaged in the extension.

Only public prompt-reference metadata is bundled; full prompts remain in the separate toolkit. External links open documentation as ordinary tabs, without executing it as extension logic. The library does not fetch remote configuration, prompts or code.

## Data types collected / transmitted to developer

None.

## Data sold to third parties

No.

## Data used for purposes unrelated to the single purpose

No.

## Data used for creditworthiness or lending

No.

## Handling of personally identifiable information / financial / health / authentication

MPU does not request or store passwords. Favorites may include PeopleSoft menu/component identifiers and optional parameters that a user chooses to save **locally**. Optional Field Entry profiles may hold field values the user captured or pasted (business keys possible) **locally only**, with export warnings. Trace actions use the user’s existing PeopleSoft session on the PeopleSoft host only.

## Permissions justification

- **storage** — save feature flags, favorites, environments, and optional allowlist locally.
- **sidePanel** — optional Side Panel for Favorites, Page Info and the local Agents library (opened from the popup or toolbar).
- **tabs** — read the active tab URL to confirm a PeopleSoft origin, servlet, site, portal and node before Side Panel navigation. Unrelated tab URLs are not retained.

## Host access

Content scripts match PeopleSoft `psp`/`psc` URL patterns. The optional allowlist disables features outside listed origins (off by default); it does not revoke Chrome's manifest permissions. Chrome site-access settings control browser-level access.

See [Chrome's disclosure requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements) and [Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use). Keep listing, Dashboard answers, and [privacy policy](../docs/privacy.md) consistent.

### Local reference and diagnostic additions (1.0.33 preparation)

Oracle documentation favorites use catalog IDs and local last-opened timestamps. Searches and guided agent evidence are not persisted or transmitted. The Fluid navigation diagnostic is explicit and structural; no page values/tokens/URLs are exported. Permissions are unchanged; popup status queries only whether the scoped content script is active.
