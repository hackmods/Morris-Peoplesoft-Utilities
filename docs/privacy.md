# Privacy Policy — Morris PeopleSoft Utilities

**Last updated:** 2026-07-21  
**Publisher:** [hackmods](https://github.com/hackmods) (Ryan Morris)  
**Product:** Morris PeopleSoft Utilities (Chrome extension)

## Summary

Morris PeopleSoft Utilities (MPU) is a Manifest V3 Chrome extension that improves productivity on PeopleSoft Classic and Fluid pages. **MPU does not collect, transmit, sell, or share personal data with the developer or any third party.**

## Data stored on your device

Settings are stored only in Chrome’s `chrome.storage.local` on your profile, including:

- Feature on/off preferences
- Favorites (may include menu/component names and optional URL parameters)
- Environment labels and URL/site mappings
- Trace flag preferences
- Optional host allowlist origins (Phase 2, off by default)

## Data MPU does not collect

- No passwords or login credentials
- No analytics, advertising, or telemetry
- No remote configuration servers operated by MPU
- No account required to use the extension

## Network activity

MPU may make requests **only to the PeopleSoft site you are already using** (same origin/session), for example to toggle delivered PeopleCode/SQL trace components when you click Trace. Those requests use your existing authenticated PeopleSoft session cookies. MPU never sends that traffic to hackmods or other third parties.

## Permissions

- **storage** — save preferences locally

Content scripts run only on PeopleSoft URL patterns (`psp` / `psc` servlet paths).

## Host allowlist (optional)

By default MPU matches PeopleSoft URL patterns on any host (parity with classic PS Utilities). You may enable an **opt-in host allowlist** in Options to restrict injection to listed origins.

## Children’s privacy

MPU is intended for workplace/education PeopleSoft users and does not target children.

## Contact

Questions or privacy requests: open an issue at  
https://github.com/hackmods/Morris-Peoplesoft-Utilities/issues

## Changes

Material changes to this policy will be reflected in this document and noted in the project CHANGELOG.
