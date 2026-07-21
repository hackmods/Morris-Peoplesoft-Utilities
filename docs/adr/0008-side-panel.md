# ADR 0008: Optional Chrome Side Panel

## Status

Accepted

## Context

The injected utilities bar is intentionally thin. BA/Dev users want more space for Favorites browsing and Page Info without leaving the PeopleSoft tab. Chrome’s Side Panel API provides that surface.

## Decision

Ship an optional Side Panel (`sidepanel.html`) for Favorites + Page Info snapshot, opened from the popup (not stealing the action click from the quick-toggles popup).

Permissions added:

- `sidePanel` — host the panel UI
- `tabs` — query/update the active tab for Favorite navigation and request a Page Info snapshot from the content script

Privacy docs (`docs/privacy.md`, `store/privacy-practices.md`) must justify these permissions. No new network destinations; no credentials; settings remain in `chrome.storage.local`.

## Consequences

Slightly broader permission surface for Store review; better BA navigation UX. Future enhancements must not use `tabs` for scraping PII beyond what the user already sees in PeopleSoft.
