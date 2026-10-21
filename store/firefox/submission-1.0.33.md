# Firefox 1.0.33 submission

Submitted to Mozilla Add-ons on 2026-10-21 for public distribution (Firefox desktop, minimum 140).

- [Manage submission](https://addons.mozilla.org/en-US/developers/addon/morris-peoplesoft-utilities/versions/6606047)
- [Product URL](https://addons.mozilla.org/en-US/firefox/addon/morris-peoplesoft-utilities/) — not public while awaiting review
- Version ID: `6606047`
- Gecko ID: `morris-peoplesoft-utilities@hackmods`
- Verified status after submission: **Awaiting Review**. Publication and Mozilla signing have not been verified; signed-install testing remains pending a signed artifact.
- Mozilla validation: **0 errors, 11 warnings**. Escaping/fixed-template evidence is included in reviewer notes; no warnings were suppressed.
- Uploaded matching source archive; confirmed its attachment in version management. Release notes, MIT license, full privacy policy, support/homepage links, approved icon and three genuine Firefox Options screenshots were saved.
- Listing screenshots show extension Options only, not real PeopleSoft compatibility evidence.

## Uploaded artifacts

Both archives were created before this submission-record commit. Preserve these exact files; do not regenerate the source archive from a later HEAD and call it the uploaded source.

Source commit: `95552e153e46ba339e1385294bb37d6ec0f3f9f0`, branch `feat/chrome-firefox-parity`.

| Artifact | SHA-256 |
| --- | --- |
| `morris-peoplesoft-utilities-firefox-v1.0.33.zip` | `879CA68EBCB0222BCE5E53D7A8F673ABBD8C88D244642DD16056BD99E98A5D4D` |
| `morris-peoplesoft-utilities-firefox-source-v1.0.33.zip` | `B51D3BF5752A24742D6E110944859EA696EAA4F0B48EDA0B040497F23DF973D1` |

The source archive includes detailed build/reviewer notes. The accompanying `amo-metadata.json` now records the concise reviewer notes actually submitted (Mozilla limits that field to 3,000 characters); the original full notes remain in `reviewer-notes.md` and the uploaded source.

## Evidence and next verification

- `submission-1.0.33.png`: Mozilla's Version Submitted confirmation.
- `review-status-1.0.33.png`: status/version screen showing Awaiting Review.
- Existing verification: 368 unit tests; 41 Chromium E2E and 8 actual-extension Firefox E2E tests passed. Browser parity and packaging audits passed.
- After approval, confirm public availability, download Mozilla's signed XPI, record its hash and test a normal signed installation in a disposable Firefox profile. Do not disable signature verification or replace the user's profile.
- Keep Chrome and Firefox on shared sources, version and settings schema, as required by `AGENTS.md` and `docs/browser-support.md`.
