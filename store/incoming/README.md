# Live listing screenshots (import folder)

Drop PNG captures here, then run:

```bash
npm run import:store-screenshots
```

Files are copied into `store/assets/screenshots/` at **1280×800** (letterboxed if needed). After import, `store/assets/screenshots/.live-captures` is created so `npm run generate:store-assets` will not overwrite your shots.

## Naming

Use either the final filename or a short alias:

| Drop in `store/incoming/` | Listing slot |
|---------------------------|--------------|
| `01-utilities-bar.png` or `utilities-bar.png` | MPU bar on a PeopleSoft page |
| `02-favorites.png` or `favorites.png` | Shortcuts / Favorites flyout |
| `03-page-info.png` or `page-info.png` | Page Information dialog |
| `04-field-inspector.png` or `field-inspector.png` | Field Inspector (Inspect ON) |
| `05-options.png` or `options.png` | Options → Features |

Chrome Web Store allows up to five screenshots; you can submit with three and add more later.

**Privacy:** blur or crop user IDs, hostnames, or business keys you do not want on a public listing.

Suggested mapping from recent captures:

- Roles search with **Inspect ON** → `01-utilities-bar.png` or `04-field-inspector.png`
- Roles maintenance with field lock bar → `04-field-inspector.png`
- Options **Features** tab → `05-options.png`
