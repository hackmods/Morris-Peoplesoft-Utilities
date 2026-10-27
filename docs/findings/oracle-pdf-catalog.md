# Oracle PDF catalog repair — 2026-10-27

The 1.0.34 version selector exposed Tools 8.56–8.63 but only 8.62 had a searchable list of individual PDFs. Choosing another Tools release removed the list. Application-family selection only exposed a landing page. The repair includes the full individual PDF link sets from Oracle's published indexes, rather than constructing filenames for other releases.

| Catalog | Manuals | Published source |
| --- | ---: | --- |
| Tools 8.63 | 46 | https://docs.oracle.com/en/applications/peoplesoft/peopletools/8.63/index.html |
| Tools 8.62 | 45 | https://docs.oracle.com/cd/G41076_01/psft/index.html |
| Tools 8.61 | 45 | https://docs.oracle.com/cd/G36973_01/psft/index.html |
| Tools 8.60 | 45 | https://docs.oracle.com/cd/G10811_01/psft/index.html |
| Tools 8.59 | 45 | https://docs.oracle.com/cd/F86651_01/psft/index.html |
| Tools 8.58 | 45 | https://docs.oracle.com/cd/F44948_01/psft/index.html |
| Tools 8.57 | 45 | https://docs.oracle.com/cd/F28300_01/psft/index.html |
| Tools 8.56 | 45 | https://docs.oracle.com/cd/E92520_02/psft/index.html |
| HCM 9.2, Update Image 55 | 71 | https://docs.oracle.com/en/applications/peoplesoft/human-capital-management/9.2.055/index.html |
| FSCM 9.2, Update Image 57 | 60 | https://docs.oracle.com/en/applications/peoplesoft/financials-and-supply-chain-management/9.2.057/index.html |
| Campus Solutions 9.2, Update Image 39 | 19 | https://docs.oracle.com/en/applications/peoplesoft/campus-solutions/9.2.039/index.html |

Total: 511 entries. `scripts/refresh-oracle-docs.mjs` is a maintainer-only metadata refresh; it extracts titles and actual PDF URLs and rejects Tools aliases redirected to another release. It is never invoked by builds or the extension. The checked JSON snapshot includes source URLs. No PDF contents are bundled or searched, and no network access happens until the user opens a link.

Application release/image labels describe the source index, independently of the entered Tools version. Shared Common books can be updated by Oracle independently. These links do not certify an exact historical patch, PUM image or real-system compatibility; Oracle may redirect or retire older content. Unsupported Tools input does not substitute another release, and does not prevent browsing an explicitly selected application family.

Existing 8.62 preference IDs remain unchanged. Other catalogs use release/family-specific IDs so one version's favorite cannot silently open another version. Search and the active list filter are retained when switching catalogs; topic selection resets when switching family because the available topics change.

This source repair targets a new shared 1.0.35 build. Previously validated 1.0.34 ZIPs and Firefox approval evidence remain historical and are not overwritten or relabelled as containing this repair.

Verification: `npm run release:check` passed 462 tests and unchanged coverage gates, both browser builds/packages, asset parity and all release audits. Firefox validation retains zero errors and the existing 11 warnings. All 52 local Chromium scenarios passed. Exact-source CI at `509cece` passed audit, Chromium, Firefox 140 and current Firefox, including the new real-extension PDF scenario. One local concurrent Firefox run lost its temporary input directory when a Chromium run cleared the shared `test-results` root; this was a test-run orchestration error, not an extension failure. Run the two local browser suites sequentially. Final source wording and submission notes are followed by a final build and independent Firefox run.

The final independent Firefox run passed all 20 scenarios. The final build passed both package audits and runtime parity, and all eight Oracle unit tests passed. The committed source archive at `c72676a` rebuilt the 29 executable/style/manifest/image files byte-for-byte with the same locked installed dependencies. Exact upload hashes and outstanding store status are in [the 1.0.35 checkpoint](../../store/submission-1.0.35.md).
