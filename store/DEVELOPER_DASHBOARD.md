# Chrome Web Store — Developer Dashboard walkthrough

Use this when you are ready to upload **Morris PeopleSoft Utilities**. All copy and assets live in the `store/` folder of the repository.

## 1. Build the upload zip

On current `main` (or your release tag):

```bash
npm ci
npm run generate:icons
npm run release:check
```

Upload **`morris-peoplesoft-utilities-v<version>.zip`** from the repo root (not `dist/` unpacked).

Or download the same artifact from the latest [GitHub Release](https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases).

## 2. Listing text

| Field | Source |
|-------|--------|
| **Name** | Morris PeopleSoft Utilities |
| **Short description** | `store/listing.md` → Short description |
| **Detailed description** | `store/listing.md` → Detailed description |
| **Category** | Productivity |
| **Language** | English |

**Homepage:** https://github.com/hackmods/Morris-Peoplesoft-Utilities  
**Support:** https://github.com/hackmods/Morris-Peoplesoft-Utilities/issues  

## 3. Privacy

| Field | Value |
|-------|--------|
| **Privacy policy URL** | https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/privacy.md |
| **Dashboard answers** | Copy from `store/privacy-practices.md` (must match `docs/privacy.md`) |

## 4. Graphics

From `store/assets/`:

| Asset | File |
|-------|------|
| Store icon (128×128) | `store-icon-128.png` |
| Small promo tile (440×280) | `promo-small-440x280.png` |
| Marquee promo (1400×560, optional) | `promo-marquee-1400x560.png` |
| Screenshots (1280×800, up to 5) | `screenshots/01` … `05` |

Suggested captions: `store/screenshot-captions.md`.

Replace mock screenshots before publish:

```bash
# copy PNGs into store/incoming/ (see store/incoming/README.md)
npm run import:store-screenshots
npm run audit:store
```

## 5. Distribution

- **Visibility:** Public  
- **Regions:** All regions (or your org’s policy)  
- **Mature content:** No  

## 6. Submit

1. Upload the zip from step 1.  
2. Confirm version matches `package.json` / manifest inside the zip.  
3. Submit for review.  

After approval, update the README Store badge and `wiki/Chrome-Web-Store.md` with the live listing URL.

Checklist: [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md)  
Readiness summary: [`docs/release-readiness.md`](../docs/release-readiness.md)
