# Release readiness — Chrome Web Store

Status for shipping Morris PeopleSoft Utilities as an official Chrome extension.

**As of:** 2026-08-07  
**Repo:** https://github.com/hackmods/Morris-Peoplesoft-Utilities  
**Target Store zip:** [v1.0.26](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases) (tag after merge) · previous: [v1.0.25](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/tag/v1.0.25)

Code, CI, audits, privacy docs, Store asset pack, and GitHub product surface are in place. Remaining work is mostly screenshot file drop + Developer Dashboard steps.

---

## Blocking before Chrome Web Store submit

These must be done before uploading / submitting for review:

1. **Import live screenshots**  
   Chat attachments are not files on disk. Drop PNG/JPEG captures into [`store/assets/screenshots/_inbox/`](../store/assets/screenshots/_inbox/) and run `npm run import:store-screenshots`. Prefer three 1280×800 shots (utilities bar, Field Inspector, Options). Optional: Favorites + Page Info. Blur sensitive IDs. CI will **not** overwrite imported captures.

2. **Manual PeopleSoft parity (owner sign-off)**  
   Spot-check [`docs/testing/manual-parity-checklist.md`](testing/manual-parity-checklist.md) on your Classic/Fluid envs (bar, Shortcuts, Page Info, Inspect, allowlist). Mark the checklist when done.

3. **Chrome Web Store Developer Dashboard (human-only)**  
   - Pay developer registration fee (if not already)  
   - Complete identity verification if prompted  
   - Paste listing copy from [`store/listing.md`](../store/listing.md)  
   - Complete privacy practices from [`store/privacy-practices.md`](../store/privacy-practices.md)  
   - Privacy policy URL:  
     `https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/privacy.md`  
   - Upload icons + promo tiles from [`store/assets/`](../store/assets/)  
   - Upload live screenshots from [`store/assets/screenshots/`](../store/assets/screenshots/)  
   - Upload extension zip and submit for review  

4. **Refresh the upload zip from tagged release**  
   After merging Store prep + screenshots to `main`:  
   - Tag `v1.0.26` so GitHub Actions publishes a fresh Release artifact, **or**  
   - Run `npm run release:check` / `npm run package` locally and upload that zip.

Operational checklist: [`store/SUBMISSION_CHECKLIST.md`](../store/SUBMISSION_CHECKLIST.md).

---

## Nice to have (not blockers)

- Sync [`wiki/`](../wiki/) sources to the GitHub Wiki (create the first wiki page in the GitHub UI, then copy pages per `wiki/README.md`)
- Optional promo video (script: [`store/promo-video-script.md`](../store/promo-video-script.md))
- Two more screenshots (Favorites flyout, Page Info dialog) if you want a fuller gallery
- Review Dependabot PRs carefully (large bumps such as Vite major can break CI)
- After Store approval: update README Store badge / live listing URL
- Post-publish: announce on the GitHub Release; add Store link to wiki Home

---

## Already complete

- Manifest V3 TypeScript extension with BA + tech feature parity targets  
- Automated tests, coverage gates, store/compliance audits, CI green on `main`  
- Privacy policy, AODA docs, ADRs, Cursor rules  
- Store listing copy, privacy questionnaire answers, icons/promo tiles  
- Screenshot import path + CI preservation of live captures (`FORCE_STORE_SCREENSHOTS=1` only to regenerate mocks)  
- GitHub Release pipeline and community health files  
- Credits to [hackmods](https://github.com/hackmods) and upstream PS Utilities authors  
- Opt-in host allowlist (default off)  
- Field Inspector per-field highlighting on Classic, Fluid, and Classic-in-Fluid nested frames (v1.0.18)  
- Shortcuts / Admin nested flyout submenus (v1.0.19)  
- Options Features regroup + PCode starter copy clarity (v1.0.20)
