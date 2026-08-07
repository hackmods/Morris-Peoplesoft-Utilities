# Store assets

Chrome Web Store listing assets.

| File | Size | Role |
|------|------|------|
| `store-icon-128.png` | 128×128 | Store listing icon |
| `promo-small-440x280.png` | 440×280 | Required small promo tile |
| `promo-marquee-1400x560.png` | 1400×560 | Optional marquee promo |
| `screenshots/01-utilities-bar.png` | 1280×800 | MPU bar on PeopleSoft |
| `screenshots/02-favorites.png` | 1280×800 | Favorites / Shortcuts (optional) |
| `screenshots/03-page-info.png` | 1280×800 | Page Information dialog (optional) |
| `screenshots/04-field-inspector.png` | 1280×800 | Field Inspector |
| `screenshots/05-options.png` | 1280×800 | Options → Features |

## Live captures (preferred for Store submit)

1. Drop PNG/JPEG files into [`screenshots/_inbox/`](_inbox/)
2. Run `npm run import:store-screenshots`
3. Confirm `screenshots/LIVE_CAPTURES.md` lists the imports

CI / `npm run generate:store-assets` **keeps existing screenshots** so live captures are not overwritten. To regenerate HTML mockups only: `FORCE_STORE_SCREENSHOTS=1 npm run generate:store-assets`.

Promo tiles and the store icon can still be regenerated with `npm run generate:store-assets` (Chrome/Edge or `CHROME_PATH` for headless capture). Extension toolbar icons: `npm run generate:icons`.
