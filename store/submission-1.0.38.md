# Shared 1.0.38 store submission — 2026-11-04

**Submitted to both stores; approval/publication remains pending.** Both
dashboards still list 1.0.37 as the published version at this checkpoint.
Version 1.0.38 includes the toolbar, field-inspector and recent-visit fixes
merged in PR #45 after the previously approved 1.0.37 build.

Matching source archive commit: `0f32d48f52a8cf0a6440d744560366122bf39125`,
pushed on `release/v1.0.38` and tracked in
[PR #47](https://github.com/hackmods/Morris-Peoplesoft-Utilities/pull/47).
Later checkpoint-only changes do not alter the packaged runtime inputs.

## Chrome Web Store

The exact Chrome ZIP below was uploaded using the in-app browser. The dashboard
confirmed **Item submitted**, **Pending review**, draft package **1.0.38**
(revision `00009`) and published package **1.0.37**. The final submission action
occurred while the user was also operating the browser; this checkpoint records
the observed result rather than attributing that click to the agent.

The listing's embedded privacy link and Privacy policy URL now point to current
`main/docs/privacy.md`, replacing the obsolete `20adf1b` policy. Existing local
website-content/PII/history disclosures were reviewed; the side-panel permission
justification now explicitly includes the local Agents reference library.
Reviewed artwork was retained.

- Item ID: `icgaljglcaoikfgjhjbbccmdiekhnphe`.
- [Public listing](https://chromewebstore.google.com/detail/icgaljglcaoikfgjhjbbccmdiekhnphe).
- Evidence: [pending package](assets/submission/chrome-1.0.38-pending-review.jpg).

## Firefox Add-ons

Mozilla confirmed **Version Submitted**, then **Awaiting Review** for 1.0.38,
with **0 errors / 9 warnings** and 1.0.37 still listed. Desktop Firefox 140+
was retained; Android was not selected. Release and reviewer notes were saved,
build tooling was declared, and **View current** confirms the matching source
attachment. Reviewer notes identify the exact source commit and build commands.

- Version ID: `6663394`; file ID: `5207488`.
- [Manage version](https://addons.mozilla.org/en-US/developers/addon/morris-peoplesoft-utilities/versions/6663394).
- Source attachment: `/firefox/downloads/source/6663394`.
- [Public listing](https://addons.mozilla.org/en-US/firefox/addon/morris-peoplesoft-utilities/).
- Evidence: [awaiting review](assets/submission/firefox-1.0.38-awaiting-review.jpg).

## Exact artifacts

Preserve these uploads and their matching committed source; do not overwrite
them with future builds using the same version.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `morris-peoplesoft-utilities-chrome-v1.0.38.zip` | 664602 | `1B81DCC628FCFC929D2AA623F465FF40E007C0F536447788F1DDC1A06C9126EC` |
| `morris-peoplesoft-utilities-firefox-v1.0.38.zip` | 664700 | `73B0ED7C15AF4026519A3CEB6B006F0EDC7F33B429FFE41BB7EA05B69C9F55E8` |
| `morris-peoplesoft-utilities-firefox-source-v1.0.38.zip` | 7395320 | `ED8C603CA35FD56A3CBA93CE5B82FBA01666CB59C6AD93A9CDAC0336713CA1C0` |

## Verification

`npm run release:check` passed lint/types, 468 tests with unchanged coverage
gates, both fresh browser packages and runtime parity, accessibility/store/
Firefox/compliance audits and the separate prompt toolkit package. Firefox lint
reported zero errors and nine warnings, retaining the desktop-only Android
consent-floor and escaped dynamic-template warnings.

The full Chromium suite passed 56 scenarios. The initial Firefox process exited
during startup, while the other 20 scenarios passed; a full independent retry
passed all 21. Exact-source
[CI run 41830168933](https://github.com/hackmods/Morris-Peoplesoft-Utilities/actions/runs/41830168933)
passed audit, Chromium, Firefox 140 and current Firefox.

The extracted source archive rebuilt all 29 JavaScript/style/manifest/image
files byte-for-byte with the same locked installed dependencies. Source maps
and HTML line endings are outside that comparison. The archive contains tracked
public source only, without local dependencies, private reference material or
credentials. These are automated/synthetic regression results, not real
PeopleTools 8.62 patch-level or accessibility conformance certification.
