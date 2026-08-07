# Release readiness — Chrome Web Store

Status for shipping Morris PeopleSoft Utilities as an official Chrome extension.

**As of:** 2026-08-07
**Repo:** https://github.com/hackmods/Morris-Peoplesoft-Utilities  
**Latest tagged zip:** [v1.0.25](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases/tag/v1.0.25)

Code, CI, audits, privacy docs, Store asset pack, and GitHub product surface are in place. Remaining work is mostly QA and Developer Dashboard steps.

---

## Blocking before Chrome Web Store submit

These must be done before uploading / submitting for review:

1. **Manual PeopleSoft parity**  
   Complete [`docs/testing/manual-parity-checklist.md`](testing/manual-parity-checklist.md) on real Classic and Fluid environments (bar, favorites, search helpers, trace, field inspector including Classic pages hosted inside Fluid menus/nav collections, allowlist off/on).

2. **Install correctly sized real screenshots**
   Files generated under [`store/assets/screenshots/`](../store/assets/screenshots/) are placeholders. Use 1–5 real PeopleSoft captures (blur sensitive IDs), each exactly **1280×800 or 640×400**. A strong minimum set is: Classic search with Inspect ON, a Classic component with field highlighting, and Options → Features. `npm run prepare:store` validates the dimensions and preserves installed real captures.

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
   Prefer the latest Release zip (currently v1.0.25). Before Store submit either:  
   - Run `npm run prepare:store` locally and upload the resulting extension zip, **or**
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
