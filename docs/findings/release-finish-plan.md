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