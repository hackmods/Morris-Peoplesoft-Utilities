# Chrome Web Store — Privacy practices answers

Use these answers in the Developer Dashboard. They must match `docs/privacy.md` and actual extension behavior.

## Single purpose

Increase productivity on PeopleSoft Classic and Fluid pages for business analysts and technical users (favorites, page metadata, search helpers, optional tracing/field inspection).

## Does this extension collect or use user data?

**No remote collection.** The extension stores preferences **locally** in Chrome storage on the user’s device.

## Remote code

No. All code is packaged in the extension.

## Data types collected / transmitted to developer

None.

## Data sold to third parties

No.

## Data used for purposes unrelated to the single purpose

No.

## Data used for creditworthiness or lending

No.

## Handling of personally identifiable information / financial / health / authentication

MPU does not request or store passwords. Favorites may include PeopleSoft menu/component identifiers and optional parameters that a user chooses to save **locally**. Trace actions use the user’s existing PeopleSoft session on the PeopleSoft host only.

## Permissions justification

- **storage** — save feature flags, favorites, environments, and optional allowlist locally.
- **sidePanel** — optional Side Panel for Favorites browsing and Page Info (opened from the popup).
- **tabs** — navigate the active PeopleSoft tab to a Favorite and request a Page Info snapshot from the content script on that same tab.

## Host access

Content scripts match PeopleSoft `psp`/`psc` URL patterns. Optional allowlist can further restrict origins (off by default).
