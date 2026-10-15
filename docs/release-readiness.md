# Release readiness — Chrome Web Store

Status for shipping Morris PeopleSoft Utilities as an official Chrome extension.

**As of:** 2026-10-14
**Repo:** https://github.com/hackmods/Morris-Peoplesoft-Utilities
**Next local package:** 1.0.28 (black/orange identity, Agents library and task briefs); build locally with `npm run prep:store`. This does not assert a published tag or Store version.

Code, CI, audits, privacy docs, Store asset pack, and GitHub product surface are in place. See the [repository review](findings/repo-review-2026-10-11.md) for fixes and unresolved release checks. Real PeopleTools 8.62 sign-off remains required.

---

## Blocking before Chrome Web Store submit

These must be done before uploading / submitting for review:

1. **Manual PeopleSoft parity**
   Complete [`docs/testing/manual-parity-checklist.md`](testing/manual-parity-checklist.md) and the [PeopleTools 8.62 matrix](testing/peopletools-8.62.md) on real Classic and Fluid environments (bar, favorites, search helpers, trace, field inspector including Classic pages hosted inside Fluid menus/nav collections, allowlist off/on).

2. **Replace mock screenshots**
   Verify sanitized, genuine captures before submission. Remote main added updated listing images and a `.live-captures` marker; that marker alone does not establish screenshot provenance. Use [`store/incoming/`](../store/incoming/README.md) and `npm run import:store-screenshots` to replace any mocks. Prefer five 1280×800 shots.
   Refresh reviewed captures for the black/orange 1.0.28 UI; existing pre-rebrand captures are not evidence of the new appearance. The two known mock warnings and real-system/assistive-technology checks remain outstanding.

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
   Before Store submit either:
   - Run `npm run release:check` / `npm run package` locally and upload that zip, **or**
   - Tag the next patch so GitHub Actions publishes a fresh Release artifact.

Publishing guides: [`store/PUBLISH.md`](../store/PUBLISH.md) and [`store/DEVELOPER_DASHBOARD.md`](../store/DEVELOPER_DASHBOARD.md). Complete the validation gates above before submission.

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
- Automated tests, coverage gates, store/compliance audits (local results are recorded in the review; remote CI status is not asserted here)
- Privacy policy, AODA docs, ADRs, Cursor rules
- Store listing copy, privacy questionnaire answers, icons/promo placeholders
- GitHub Release pipeline and community health files
- Credits to [hackmods](https://github.com/hackmods) and upstream PS Utilities authors
- Opt-in host allowlist (default off)
- Field Inspector per-field highlighting on Classic, Fluid, and Classic-in-Fluid nested frames (v1.0.18)
- Shortcuts / Admin nested flyout submenus (v1.0.19)
- Options Features regroup + PCode starter copy clarity (v1.0.20)
