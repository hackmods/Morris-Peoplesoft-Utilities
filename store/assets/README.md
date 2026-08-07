# Store assets

Chrome Web Store listing assets. Run `npm run prepare:store` for the complete
release gate. `generate:store-assets` creates missing screenshot mockups but
preserves real captures already in this directory; set
`FORCE_MOCK_SCREENSHOTS=1` only when intentionally rebuilding the mockups.

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

Mockups use the real MPU bar/options styling and fictional demo data (`HRDEV`, `JSMITH`, `PSOPRDEFN.*`). They are suitable for draft review only. Before final submission, replace them with 1–5 real PNG captures that are exactly 1280×800 or 640×400 and blur sensitive IDs. The Store audit rejects incorrect dimensions.

Recommended three-shot final set:

1. Classic search page with **Inspect ON**
2. Classic component page showing the MPU bar and field highlighting
3. MPU **Options → Features**

Requires Chrome or Edge on PATH (or `CHROME_PATH`) for headless capture. Extension toolbar icons: `npm run generate:icons` (copies the 128 store icon when present).
