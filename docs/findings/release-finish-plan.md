# Release finish plan

This plan tracks the remaining work toward the 1.0.32 release. Items below are planned work, not claims that the checks or release have happened.

1. Fix upgrade-capture honesty and UI comparison warnings: disclose incomplete captures, cap a capture at 200 unique field IDs, and warn about Page Info identity or UI-context mismatches.
2. Finish the upgrade-watch walkthrough and focused regression coverage. Keep the Fluid collection save-warning regression marked unverified until it is checked on a real PeopleTools 8.62 system.
3. Run the release checks, build, and `npm run package` against the fresh build; confirm the audited extension and agents ZIPs are the intended 1.0.32 artifacts.
4. Review the working tree, commit and push the source changes, and publish a GitHub release with both ZIPs attached.
5. Submit the extension package to the Chrome Web Store and record the submission state accurately.
6. Perform and document real-system PeopleTools 8.62 verification, including the Fluid navigation-collection save-warning scenario. Do not report a scenario as passed until its actual outcome is recorded.

## Implementation and validation — 2026-10-20

- Completed capture completeness warnings, page/UI/object mismatch warnings, fresh metadata at comparison time, visible capture limits, and the walkthrough.
- Lint passed. Coverage: 31 files / 288 tests passed, 84.45% lines; gates unchanged.
- Chromium: 26 tests passed on the full run. The new Upgrade test initially expected an unescaped Markdown underscore; correcting that assertion produced a passing targeted rerun, including rendered axe and narrow viewport checks. All 27 scenarios are verified.
- Accessibility, store and compliance audits passed. Fresh extension and agents ZIPs built for 1.0.32; prompt content remains 4.2.0.
- GitHub publication and Chrome submission follow this source checkpoint. Real-system verification remains open as described above.

## Publication checkpoint

Source commit `5ba7eec` is pushed to `main`. GitHub release [v1.0.32](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/tag/v1.0.32) is published with both ZIPs verified as uploaded.

After maintainer reauthentication, the dashboard showed 1.0.31 published. The tested 1.0.32 ZIP (SHA-256 `db446cf7ff11431a122da3efe009bff95215969132a10fcabac98e47a6de5a2b`) was uploaded and successfully submitted for review with automatic publication enabled. The Package page confirms 1.0.32 pending review and 1.0.31 published. Google approval and real-system verification remain outstanding.

## Subsequent submission attempt — 2026-10-21

The user authorized submission of the tested J/A/D/K/I work. A fresh local **1.0.33** candidate was packaged (484312 bytes; SHA-256 `2a5bc61b2cab8138521385664663a4280212c7383a5e5934a5d388f5cdaf2b3b`). Chrome dashboard access was denied by the browser connector, and native computer use stopped because it could not verify the current browser URL. **No upload or submission occurred, and current Store status is unknown.** The 1.0.32 publication paragraph above is historical evidence, not a fresh status check.

The candidate is frozen in the repository root and `.roadmap-ki-release-candidate-v1.0.33.zip`. The earlier 461351-byte 1.0.33 package is preserved as `.roadmap-original-092966e-v1.0.33.zip`. Subsequent C comparison code is tested in the working tree / `dist/` and is not part of the candidate. Restore dashboard access, inspect published/pending versions, and ensure hosted privacy disclosures match the candidate before uploading. Do not package C into this candidate accidentally. See the [latest roadmap checkpoint](developer-admin-roadmap.md).

The later native local-window attempt avoided the Chrome MCP connector as requested. Accessibility reading worked, but screenshot capture timed out and both navigation attempts failed to activate the captured window. No Store status or submission was obtained. G configuration comparison is now also in the working tree / `dist/`, outside the frozen candidate; its tab-memory file handling and reviewable exports are documented in repository privacy disclosures for a future release. The candidate hash above was rechecked and is unchanged. No package, version, hosted policy or Store changes were made during G.

## Chrome submission completed — 2026-10-21

The latest integrated Chrome/Firefox source at `20adf1b77fc98ffd4e46fda88f93f41816854173` was rebuilt with `npm run package`; shared asset parity, Chrome store audit and Firefox validation passed (existing documented Firefox warnings retained). Chrome ZIP: `morris-peoplesoft-utilities-chrome-v1.0.33.zip`, 537532 bytes, SHA-256 `e037f6c786c717e77ce88cc52a80c0ca265d9aa6f7daddbd3c73f9c568b31741`. This supersedes the earlier frozen candidates and includes the integrated comparison features.

The release branch `feat/chrome-firefox-parity` was pushed so its current privacy disclosures are publicly accessible. The Chrome privacy-policy field and listing privacy link now point to the matching immutable source policy: https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/20adf1b77fc98ffd4e46fda88f93f41816854173/docs/privacy.md . Storage justification was updated to cover runbooks, manual preferences and local comparison data; existing data categories were retained.

Google confirmed successful submission with automatic publication after review enabled. Package page shows **1.0.33 pending review** and **1.0.32 published**. Evidence: `store/assets/submission/chrome-1.0.33-pending-review.png`. Google approval remains pending; this is not a claim that 1.0.33 is live or that real PeopleTools validation has passed. Firefox submission was not changed during this task.
