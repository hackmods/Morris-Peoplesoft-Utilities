# Chrome Web Store submission checklist

See also the prioritized readiness summary: [`docs/release-readiness.md`](../docs/release-readiness.md).

## Blocking before Chrome Web Store submit

- [ ] Live screenshots imported (`store/assets/screenshots/_inbox/` → `npm run import:store-screenshots`; blur sensitive IDs)
- [ ] Manual PeopleSoft parity spot-check signed off ([`docs/testing/manual-parity-checklist.md`](../docs/testing/manual-parity-checklist.md))
- [ ] Tag / package **v1.0.26** upload zip (`npm run package` or GitHub Release after merge to `main`)
- [ ] `npm run release:check` passes locally and CI is green on `main`
- [ ] Privacy policy URL reachable (`docs/privacy.md` on GitHub)
- [ ] Listing copy from `store/listing.md` pasted into dashboard
- [ ] Privacy practices from `store/privacy-practices.md` completed in dashboard
- [ ] Icons: 128×128 store icon + extension icons uploaded
- [ ] Small promo 440×280 uploaded
- [ ] Marquee 1400×560 uploaded (optional but included in repo)
- [ ] Screenshots uploaded (at least bar + Field Inspector + Options)
- [ ] No legacy `key` field in packaged manifest
- [ ] Credits mention hackmods + PS Utilities inspiration

## Human-only Developer Dashboard steps

- [ ] Pay Chrome Web Store developer registration fee (if not already)
- [ ] Complete identity verification if prompted
- [ ] Upload zip (`morris-peoplesoft-utilities-v1.0.26.zip` from GitHub Release)
- [ ] Submit for review
- [ ] After publish: update README Store badge/URL

## Paste-ready dashboard fields

| Field | Source |
|---|---|
| Short description | `store/listing.md` → Short description |
| Detailed description | `store/listing.md` → Detailed description |
| Category | Productivity |
| Language | English |
| Privacy policy URL | `https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/privacy.md` |
| Privacy questionnaire | `store/privacy-practices.md` |
| Store icon | `store/assets/store-icon-128.png` |
| Small promo | `store/assets/promo-small-440x280.png` |
| Marquee promo | `store/assets/promo-marquee-1400x560.png` |
| Screenshots | `store/assets/screenshots/01…05*.png` (live imports) |
| Extension package | GitHub Release `morris-peoplesoft-utilities-v1.0.26.zip` |

## Nice to have (not blockers)

- [ ] Sync `wiki/` sources to GitHub Wiki
- [ ] Optional promo video (`store/promo-video-script.md`)
- [ ] Carefully review Dependabot major bumps before merging
- [ ] Announce Store publish on GitHub Release notes
- [ ] Update wiki Home with live Store link

## Already in place (reference)

- MV3 extension, CI, audits, coverage
- Privacy / AODA / ADR docs
- Store asset pack + listing drafts
- Screenshot import + CI does not clobber live captures
- GitHub Release workflow
- hackmods + upstream credits
