# Publish Morris PeopleSoft Utilities to the Chrome Web Store

One-page checklist after **`v1.0.26`** is on `main`.

## Before you open the dashboard

1. **Optional — pixel-perfect screenshots**  
   If you have your own PNGs, put them in [`store/incoming/`](incoming/README.md) and run `npm run import:store-screenshots`, then commit.  
   Otherwise use the committed assets under `store/assets/screenshots/` (01, 04, 05 = Roles/Options; 02, 03 = Favorites/Page Info mocks).

2. **Get the extension zip** (pick one):
   - **GitHub Release:** [Releases](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases) → `v1.0.26` → download `morris-peoplesoft-utilities-v1.0.26.zip`
   - **Local:**  
     ```bash
     npm ci
     npm run generate:icons
     npm run prep:store
     ```
     Upload `morris-peoplesoft-utilities-v1.0.26.zip` from the repo root.

3. **Sanity check**
   ```bash
   npm run audit:store
   ```
   Fix any **errors**; **warnings** on screenshots 02/03 are OK if you are fine shipping those two mocks for now.

## Chrome Web Store Developer Dashboard

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item** (or your existing draft).
2. **Upload** the zip from step 2. Wait for package validation.
3. **Store listing** — paste from [`listing.md`](listing.md) (short + detailed description). Category: **Productivity**. Language: **English**.
4. **Privacy**
   - Policy URL: `https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/privacy.md`
   - Questionnaire: [`privacy-practices.md`](privacy-practices.md)
5. **Graphics** — from [`assets/`](assets/):
   - Icon 128×128: `store-icon-128.png`
   - Small promo 440×280: `promo-small-440x280.png`
   - Marquee (optional): `promo-marquee-1400x560.png`
   - Screenshots 1280×800: `screenshots/01` … `05` (captions in [`screenshot-captions.md`](screenshot-captions.md))
6. **Distribution** — Public; regions per your policy; not mature content.
7. **Submit for review** (first submission may require developer account fee + identity verification).

## After Google approves

1. Copy the public Store listing URL.
2. Update [README.md](../README.md) Chrome Web Store badge/link.
3. Update [wiki/Chrome-Web-Store.md](../wiki/Chrome-Web-Store.md) with the live URL.
4. Optional: GitHub Release notes announcing Store availability.

## Reference

- Full dashboard walkthrough: [`DEVELOPER_DASHBOARD.md`](DEVELOPER_DASHBOARD.md)
- Checkbox list: [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md)
- Readiness notes: [`docs/release-readiness.md`](../docs/release-readiness.md)
