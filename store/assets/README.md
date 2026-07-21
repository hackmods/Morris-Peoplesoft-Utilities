# Store assets

Generated preview assets for Chrome Web Store listing (`npm run generate:store-assets`).

| File | Size | Role |
|------|------|------|
| `store-icon-128.png` | 128×128 | Store listing icon |
| `promo-small-440x280.png` | 440×280 | Required small promo tile |
| `promo-marquee-1400x560.png` | 1400×560 | Optional marquee promo |
| `screenshots/01-utilities-bar.png` | 1280×800 | MPU bar on a demo PeopleSoft page |
| `screenshots/02-favorites.png` | 1280×800 | Favorites quick-jump |
| `screenshots/03-page-info.png` | 1280×800 | Page Information dialog |
| `screenshots/04-field-inspector.png` | 1280×800 | Field Inspector hover/lock |
| `screenshots/05-options.png` | 1280×800 | Options → Features |

Mockups use the real MPU bar/options styling and fictional demo data (`HRDEV`, `JSMITH`, `PSOPRDEFN.*`). They are suitable for draft Store review; replace screenshots with live Classic/Fluid captures (blur sensitive IDs) before final publish.

Requires Chrome or Edge on PATH (or `CHROME_PATH`) for headless capture. Extension toolbar icons: `npm run generate:icons` (copies the 128 store icon when present).
