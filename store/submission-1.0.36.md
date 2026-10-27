# Shared 1.0.36 quality consolidation checkpoint — 2026-10-27

**Prepared and verified; not submitted to either store.** Firefox 1.0.34 remains
the last verified approved/listed version. The frozen 1.0.35 packages lack the
follow-up quality repairs and must not be uploaded.

Matching source archive commit: `b091aa852e6da5a89b5feb586d9d48c068f6aab9`.
The browser packages use the same executable inputs. Later checkpoint-only
commits do not change those inputs. Preserve these exact artifacts:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `morris-peoplesoft-utilities-chrome-v1.0.36.zip` | 648984 | `A8CA3A70EBFFF29242CA5ADB2E69396E923C9FC9EDE4CD45553FE720AC9A3BC8` |
| `morris-peoplesoft-utilities-firefox-v1.0.36.zip` | 649083 | `7508B89657F660B8E90A9450BCB0001C81B7C370E5CF217B64348028BF0F2549` |
| `morris-peoplesoft-utilities-firefox-source-v1.0.36.zip` | 7376612 | `9216863650C8C02E920A91B5220E328D583435834DDF81AE66BA65963E04A716` |

`npm run release:check` passed with 468 tests and unchanged coverage thresholds:
lint/types, both fresh packages, runtime parity, store/Firefox/accessibility/
compliance audits and the separate prompt toolkit package. Firefox validation
retains zero errors and the existing 11 documented warnings.

The consolidation passed 52 Chromium and 20 installed-Firefox scenarios locally.
After the final initial-load guard and historical report-byte regression, exact
source `b091aa8` passed all four CI jobs: audit, Chromium, Firefox 140 and current
Firefox. The extracted source archive rebuilt all 29 runtime JavaScript/style/
manifest/image files byte-for-byte with the same locked installed dependencies.
Source maps and HTML line endings are outside that comparison.

Changes, failing-before regressions, sibling decisions and remaining usability/
real-system evidence gaps are in
[the quality review](../docs/findings/release-quality-review-2026-10-27.md).
Mozilla release/reviewer material is current in `firefox/amo-metadata.json` and
`firefox/reviewer-notes-1.0.36.md`; attach the matching source archive.

Publication remains outstanding. Chrome still needs its older listing/privacy
links aligned with current `docs/privacy.md`, then package upload and submission.
The last native-control attempt stopped because it could not reliably determine
the browser URL. No later upload or store-status claim is made by this review.
