# Shared 1.0.34 store deployment checkpoint

Prepared 2026-10-25 at the user's request to deploy updated builds to Chrome Web
Store and Mozilla Add-ons. **Firefox 1.0.34 is submitted, approved and listed.
Chrome submission remains in progress.**

## Firefox submission completed — 2026-10-25

The user uploaded the Firefox package after completing MFA. The remaining flow
was completed in the connected browser: release/reviewer notes saved, build
tooling declared, and the exact matching source ZIP below attached. Mozilla
confirmed **Version Submitted** and then showed **Approved**, **Listed Version
1.0.34**, and an available signed XPI.

- Version ID: `6621177`; file ID: `5165291`.
- [Manage version](https://addons.mozilla.org/en-US/developers/addon/morris-peoplesoft-utilities/versions/6621177).
- [Public listing](https://addons.mozilla.org/en-US/firefox/addon/morris-peoplesoft-utilities/).
- The version page confirms a current source attachment and the saved release
  notes. Reviewer notes now say the matching source ZIP is attached.
- Mozilla's full privacy policy was updated to current `docs/privacy.md`
  (2026-10-22), including Scheduler/IB and Trace SQL disclosures, and verified
  after saving. MIT license and existing authors were retained.
- Evidence: `assets/submission/firefox-1.0.34-submitted.png` and
  `assets/submission/firefox-1.0.34-approved.png`. These genuine dashboard captures
  establish store status, not real PeopleTools or signed-install validation.

## Exact artifacts

Source archive commit: `5b0e8a78207b8311a068d880bdbf0126a6536db3` on
`release/v1.0.34`. Browser ZIPs were built at `fde17cb`; the later commit only
updates store disclosures/reviewer documentation and does not change build inputs.
Preserve these files; do not overwrite them with later source and retain these hashes.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `morris-peoplesoft-utilities-chrome-v1.0.34.zip` | 632360 | `5A5BB9BE991365B464CB6D78252E3E10C7F321748125BB0281FCED60AA28C406` |
| `morris-peoplesoft-utilities-firefox-v1.0.34.zip` | 632457 | `8E7569AAFD53258DD6554E2D911DA38A2E83440C2F00727DB72E7A4B57287E28` |
| `morris-peoplesoft-utilities-firefox-source-v1.0.34.zip` | 7212659 | `C4C9BE71E688008AC7031F630E0C3F521E1ADA86EB1A0DC0B1B67EA729800C71` |

`npm run release:check` passed: lint/types, fresh dual package/build, shared asset
parity, 460 tests with unchanged coverage gates, accessibility/store/Firefox/
compliance audits and the separate agent toolkit package. Source `fde17cb` also
passed separate Chromium, Firefox 140 and current Firefox CI jobs. Firefox
validation retains zero errors and 11 documented warnings.

Both browser ZIPs were inspected for root version 1.0.34 manifests, licenses,
no nested browser output, and the stable Gecko ID. The source ZIP excludes
generated/local/private inputs. An extracted source build using the same locked
installed dependencies matched all 29 executable/style/manifest/image files in
the upload build. Source maps and HTML line endings are outside that byte check.

## Initial dashboard state and access blockers (historical)

- Chrome: creating the publisher dashboard tab returned `Not allowed`; the
  public Chrome Web Store page was also denied. No current published/pending
  version or listing privacy URL was inspected. No upload/submission occurred.
- Mozilla: the signed-in version dashboard showed **1.0.33 Approved**, listed
  publicly, with zero errors/11 warnings. Opening the visible Upload a New
  Version link failed before dispatch; a semantic click timed out; direct
  navigation to the observed submission URL also timed out. A recovery read
  still showed the original versions page. No file was selected or uploaded.
- A fresh tab to the observed Mozilla submission URL reached mandatory Mozilla
  account reauthentication (Sign in to continue to Add-ons). That sign-in page
  is retained for the user to complete; no authentication input was automated.
- The user was asked to open/allow the connected store dashboards. The Mozilla
  dashboard was retained for handoff. Store approval/signing/publication of
  1.0.34 remains unperformed, and real PeopleTools evidence is unchanged.

## Resume submission

1. Complete Mozilla reauthentication, restore connected Chrome dashboard access,
   and inspect current published/pending
   versions before changing them. Do not replace another pending review blindly.
2. Chrome: select the exact Chrome ZIP above, reconcile the listing/privacy
   policy with current `docs/privacy.md` and `store/privacy-practices.md`, and
   submit the updated version for review.
3. Mozilla submission is complete as recorded above. Preserve the exact package
   and source archive; normal signed-install testing remains a separate check.
4. Record actual confirmation URLs/status and screenshots for each store.
   Submission is not approval or proof that the new version is live.
