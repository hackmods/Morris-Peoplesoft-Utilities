# Chrome Web Store submission checklist

## Before upload

- [ ] `npm run release:check` passes locally and CI is green on `main`
- [ ] Version in `package.json` matches release tag
- [ ] GitHub Release contains `morris-peoplesoft-utilities-vX.Y.Z.zip`
- [ ] Privacy policy URL reachable (GitHub `docs/privacy.md`)
- [ ] Listing copy from `store/listing.md` pasted into dashboard
- [ ] Privacy practices from `store/privacy-practices.md` completed
- [ ] Icons: 128×128 store icon + extension icons
- [ ] Small promo 440×280 uploaded
- [ ] Marquee 1400×560 uploaded (optional but included)
- [ ] At least one 1280×800 screenshot (prefer all five); replace mocks with live PS captures when available
- [ ] Manual parity checklist completed for target PeopleTools versions
- [ ] No legacy `key` field in packaged manifest
- [ ] Credits mention hackmods + PS Utilities inspiration

## Human-only Developer Dashboard steps

- [ ] Pay Chrome Web Store developer registration fee (if not already)
- [ ] Complete identity verification if prompted
- [ ] Upload zip from GitHub Release
- [ ] Submit for review
- [ ] After publish: update README Store badge/URL

## Post-publish

- [ ] Announce in GitHub Release notes
- [ ] Update wiki Home with Store link
