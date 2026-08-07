# Chrome Web Store submission checklist

**Publish checklist:** [`PUBLISH.md`](PUBLISH.md)  
**Dashboard walkthrough:** [`DEVELOPER_DASHBOARD.md`](DEVELOPER_DASHBOARD.md)  
**Readiness summary:** [`docs/release-readiness.md`](../docs/release-readiness.md)

## Before you upload

- [ ] Live screenshots in `store/assets/screenshots/` (see [`store/incoming/README.md`](incoming/README.md) + `npm run import:store-screenshots`)
- [ ] `npm run audit:store` — no errors; resolve mock-screenshot **warnings** before public listing
- [ ] `npm run prep:store` — produces `morris-peoplesoft-utilities-v*.zip` from current `main`
- [ ] `npm run release:check` passes (CI gate)
- [ ] Manual PeopleSoft parity optional but recommended ([`docs/testing/manual-parity-checklist.md`](../docs/testing/manual-parity-checklist.md))

## Developer Dashboard (copy/paste)

- [ ] Listing copy from [`listing.md`](listing.md)
- [ ] Privacy practices from [`privacy-practices.md`](privacy-practices.md)
- [ ] Privacy policy URL: `https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/privacy.md`
- [ ] Icons + promo from [`assets/`](assets/) + screenshots `assets/screenshots/01`–`05`
- [ ] Upload zip from `npm run prep:store` or latest GitHub Release
- [ ] Pay developer registration fee / complete identity verification if prompted
- [ ] Submit for review
- [ ] After publish: README Store badge + [`wiki/Chrome-Web-Store.md`](../wiki/Chrome-Web-Store.md) live URL

## Already in place

- MV3 extension, CI, audits, coverage
- Privacy / AODA / ADR docs
- Listing drafts, promo tiles, icon pack
- GitHub Release workflow (does **not** regenerate listing screenshots on tag)
- hackmods + upstream PS Utilities credits

## Nice to have

- [ ] Sync `wiki/` to GitHub Wiki
- [ ] Promo video ([`promo-video-script.md`](promo-video-script.md))
- [ ] Announce on GitHub Release when Store goes live
