# Release readiness — Chrome Web Store

Status for shipping Morris PeopleSoft Utilities as an official Chrome extension.

**As of:** 2026-08-07  
**Repo:** https://github.com/hackmods/Morris-Peoplesoft-Utilities  
**Next release zip:** tag `v1.0.26` after merge (or `npm run prep:store` locally)

Code, CI, audits, privacy docs, and Store asset pack are in place. Remaining work is importing your live screenshots, uploading the zip, and completing the Developer Dashboard.

---

## Submit today (minimal path)

1. **Import screenshots** — copy PNGs into [`store/incoming/`](../store/incoming/README.md), run `npm run import:store-screenshots`, commit the updated `store/assets/screenshots/` files.
2. **Build zip** — `npm run prep:store` (or wait for CI tag `v1.0.26`).
3. **Dashboard** — follow [`store/DEVELOPER_DASHBOARD.md`](../store/DEVELOPER_DASHBOARD.md).

---

## Blocking before Chrome Web Store submit

1. **Live listing screenshots** — replace HTML mocks under [`store/assets/screenshots/`](../store/assets/screenshots/). `npm run audit:store` warns while files still match generated mocks.
2. **Fresh upload zip** from current `main` or latest Release tag.
3. **Developer Dashboard** — listing, privacy, graphics, zip (human-only; see checklist).

Optional but recommended: manual parity on Classic + Fluid ([`manual-parity-checklist.md`](testing/manual-parity-checklist.md)).

---

## Already complete

- Manifest V3 TypeScript extension, tests, coverage, store/compliance audits, CI  
- Privacy policy, AODA docs, ADRs  
- Listing copy, privacy questionnaire answers, icons/promo tiles  
- GitHub Release pipeline (icons + zip only — screenshots are not regenerated on tag)  
- Credits to hackmods and upstream PS Utilities authors  
- Opt-in host allowlist (default off)

Operational checklist: [`store/SUBMISSION_CHECKLIST.md`](../store/SUBMISSION_CHECKLIST.md).
