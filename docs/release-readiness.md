# Release readiness — Chrome Web Store

Status for shipping Morris PeopleSoft Utilities as an official Chrome extension.

**As of:** 2026-07-22  
**Repo:** https://github.com/hackmods/Morris-Peoplesoft-Utilities  
**Latest tagged zip:** [v1.0.21](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/tag/v1.0.21)

Code, CI, audits, privacy docs, Store asset pack, and GitHub product surface are in place. Remaining work is mostly QA and Developer Dashboard steps.

---

## Blocking before Chrome Web Store submit

These must be done before uploading / submitting for review:

1. **Manual PeopleSoft parity**  
   Complete [`docs/testing/manual-parity-checklist.md`](testing/manual-parity-checklist.md) on real Classic and Fluid environments (bar, favorites, search helpers, trace, field inspector including Classic pages hosted inside Fluid menus/nav collections, allowlist off/on).

2. **Replace mock screenshots**  
   Files under [`store/assets/screenshots/`](../store/assets/screenshots/) are placeholders. Capture real MPU UI on PeopleSoft (blur sensitive IDs) before Store upload. Prefer five 1280×800 shots.

3. **Chrome Web Store Developer Dashboard (human-only)**  
   - Pay developer registration fee (if not already)  
   - Complete identity verification if prompted  
   - Paste listing copy from [`store/listing.md`](../store/listing.md)  
   - Complete privacy practices from [`store/privacy-practices.md`](../store/privacy-practices.md)  
   - Privacy policy URL:  
     `https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/privacy.md`  
   - Upload icons + promo tiles from [`store/assets/`](../store/assets/)  
   - Upload extension zip and submit for review  

4. **Refresh the upload zip from current `main`**  
   Prefer the latest Release zip (currently v1.0.21). Before Store submit either:  
   - Run `npm run release:check` / `npm run package` locally and upload that zip, **or**  
   - Tag the next patch so GitHub Actions publishes a fresh Release artifact.

Operational checklist: [`store/SUBMISSION_CHECKLIST.md`](../store/SUBMISSION_CHECKLIST.md).

---

## Nice to have (not blockers)

- Sync [`wiki/`](../wiki/) sources to the GitHub Wiki (create the first wiki page in the GitHub UI, then copy pages per `wiki/README.md`)
- Optional promo video (script: [`store/promo-video-script.md`](../store/promo-video-script.md))
- Review Dependabot PRs carefully (large bumps such as Vite major can break CI)
- After Store approval: update README Store badge / live listing URL
- Post-publish: announce on the GitHub Release; add Store link to wiki Home

---

## Already complete

- Manifest V3 TypeScript extension with BA + tech feature parity targets  
- Automated tests, coverage gates, store/compliance audits, CI green on `main`  
- Privacy policy, AODA docs, ADRs, Cursor rules  
- Store listing copy, privacy questionnaire answers, icons/promo placeholders  
- GitHub Release pipeline and community health files  
- Credits to [hackmods](https://github.com/hackmods) and upstream PS Utilities authors  
- Opt-in host allowlist (default off)  
- Field Inspector per-field highlighting on Classic, Fluid, and Classic-in-Fluid nested frames (v1.0.18)  
- Shortcuts / Admin nested flyout submenus (v1.0.19)  
- Options Features regroup + PCode starter copy clarity (v1.0.20)
