# Chrome Web Store submission checklist

See also the prioritized readiness summary: [`docs/release-readiness.md`](../docs/release-readiness.md).

## Blocking before Chrome Web Store submit

- [ ] Manual PeopleSoft parity checklist completed ([`docs/testing/manual-parity-checklist.md`](../docs/testing/manual-parity-checklist.md)) on target Classic/Fluid envs
- [ ] Replace mock screenshots under `store/assets/screenshots/` with real captures (blur sensitive IDs)
- [ ] Refresh upload zip from current `main` (`npm run package` or tag `v1.0.25+` for a new GitHub Release artifact)
- [ ] `npm run release:check` passes locally and CI is green on `main`
- [ ] Privacy policy URL reachable (`docs/privacy.md` on GitHub)
- [ ] Listing copy from `store/listing.md` pasted into dashboard
- [ ] Privacy practices from `store/privacy-practices.md` completed in dashboard
- [ ] Icons: 128×128 store icon + extension icons uploaded
- [ ] Small promo 440×280 uploaded
- [ ] Marquee 1400×560 uploaded (optional but included in repo)
- [ ] No legacy `key` field in packaged manifest
- [ ] Credits mention hackmods + PS Utilities inspiration

## Human-only Developer Dashboard steps

- [ ] Pay Chrome Web Store developer registration fee (if not already)
- [ ] Complete identity verification if prompted
- [ ] Upload zip (refreshed from current `main`)
- [ ] Submit for review
- [ ] After publish: update README Store badge/URL

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
- GitHub Release workflow
- hackmods + upstream credits
