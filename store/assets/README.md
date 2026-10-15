# Store assets

The current icon source is `mpu-peoplesoft-icon-v4.png` (white PS lettering on black,
orange form rows and checkmark), recoloured for the requested UnionOps palette.
The previous navy/gold v3 artwork remains as a historical source. Run `npm run generate:icons` to resize v4 to the store
128px icon and the extension's 16/32/48/128px icons while preserving transparency.
The store asset generator preserves this approved icon.

| File | Size | Role |
|------|------|------|
| `store-icon-128.png` | 128×128 | Store listing icon |
| `promo-small-440x280.png` | 440×280 | Required small promo tile |
| `promo-marquee-1400x560.png` | 1400×560 | Optional marquee promo |
| `screenshots/01-utilities-bar.png` | 1280×800 | MPU bar on PeopleSoft |
| `screenshots/02-favorites.png` | 1280×800 | Favorites / Shortcuts |
| `screenshots/03-page-info.png` | 1280×800 | Page Information |
| `screenshots/04-field-inspector.png` | 1280×800 | Field Inspector |
| `screenshots/05-options.png` | 1280×800 | Options → Features |

## Live captures vs mocks

- **Import live PNGs:** drop files in [`../incoming/`](../incoming/README.md), run `npm run import:store-screenshots`.
- **Regenerate mocks/promo only:** `npm run generate:store-assets` (skips screenshots when `screenshots/.live-captures` exists).
- **Extension toolbar icons:** `npm run generate:icons` (uses the versioned v4 source).

`npm run audit:store` warns if listing screenshots still match generated mock hashes.
