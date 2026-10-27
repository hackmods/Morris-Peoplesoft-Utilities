# Shared 1.0.35 PDF repair deployment checkpoint

**Superseded by the 1.0.36 quality consolidation. Do not upload these frozen
1.0.35 candidates.** They lack the subsequent preference-race and redundant
Trace SQL parsing repairs. Their hashes remain historical evidence.

Prepared 2026-10-27 after the maintainer reported that the PDF feature had not
expanded the needed links. The repair adds individual searchable PDFs for both
Tools releases and application families. **Neither store has received 1.0.35
yet.** Firefox 1.0.34 remains the last verified approved/listed version. Chrome
1.0.34 was never submitted and is superseded by this candidate.

## Exact artifacts

Committed source archive: `c72676a`, branch `fix/oracle-pdf-catalog`, PR #44.
The upload packages were built from the same executable inputs. Preserve these
files and hashes; do not regenerate them from later work under the same label.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `morris-peoplesoft-utilities-chrome-v1.0.35.zip` | 648412 | `45FEF77076581FA1F62DDA1FF41B8F6F749F4C58A4225BBAB761D350BD883ED1` |
| `morris-peoplesoft-utilities-firefox-v1.0.35.zip` | 648509 | `5841ADBD26647A72D03659FD17C3AF2E8D7C5AA7428C60FD818226294D4D7D51` |
| `morris-peoplesoft-utilities-firefox-source-v1.0.35.zip` | 7368729 | `86A9DF2DB058949DF73A4E845B93863960084221595C4C962AE4DD268FC3BC3B` |

Both package root manifests are version 1.0.35, include LICENSE/NOTICE, and
contain no nested browser output. Shared runtime asset parity passed. The
extracted committed source archive rebuilt all 29 executable/style/manifest/image
files byte-for-byte using the same locked installed dependencies; source maps
and HTML line endings are outside that comparison.

## Validation and submission material

`npm run release:check` passed 462 tests, unchanged coverage thresholds, lint,
both browser builds/packages, browser parity, accessibility, store and compliance
audits. Firefox validation retains zero errors and the existing 11 warnings.
All 52 Chromium scenarios passed locally; source `509cece` passed all four CI
jobs (audit, Chromium, Firefox 140 and current Firefox). Final wording/source
notes at `c72676a` are followed by a fresh dual package, passing eight targeted
Oracle unit tests and all 20 independent local Firefox scenarios. Final CI
status is recorded on PR #44.

Mozilla release/reviewer text is in `firefox/amo-metadata.json` and
`firefox/reviewer-notes-1.0.35.md`. Supply the exact matching source ZIP. Privacy
semantics are unchanged by the catalog repair. Chrome still needs its existing
listing/privacy links updated from the older 20adf1b policy to current
`docs/privacy.md`, then package upload and submission.

The previously selected publisher tabs were no longer present on 2026-10-27.
Opening the Chrome package dashboard through the connected browser returned
`Not allowed`; no upload or store modification occurred. The maintainer has
been asked to reopen the dashboard. Publication remains a separate unresolved
step; no claim of 1.0.35 approval or real PeopleTools compatibility is made.
