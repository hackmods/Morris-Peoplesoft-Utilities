# Host allowlist (Phase 2 — opt-in)

## Default behavior

MPU injects on URLs matching PeopleSoft `psp` / `psc` path patterns on **any host**. This preserves equal access relative to classic PS Utilities and supports public Chrome Web Store distribution.

## Opt-in tightening

Options → **Host allowlist**:

1. Enable **Enable host allowlist**
2. Enter origins, one per line, e.g. `https://hr.college.edu`
3. Save

When enabled:

- Only listed origins receive the utilities bar / content features
- An empty list means **no pages** are enhanced
- Entries must be valid HTTP(S) origins; empty strings, malformed prefixes and URL credentials never match.

This controls MPU behavior after its content script loads. It does not revoke or narrow Chrome's declared permissions; use Chrome's extension site-access settings for browser-enforced restrictions.

## IT notes

- Can be documented in college security reviews as an available control
- Does not require a private Store listing
- Favorites export may still contain business keys — treat CSV/JSON backups as sensitive

## Compliance docs

See also [privacy.md](privacy.md) and `store/privacy-practices.md`.
