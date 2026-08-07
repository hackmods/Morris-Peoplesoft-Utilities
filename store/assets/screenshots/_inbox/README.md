# Screenshot inbox

Drop live PeopleSoft / MPU PNG or JPEG captures here, then run:

```bash
npm run import:store-screenshots
```

The importer letterboxes each image to **1280×800** and writes into the parent `screenshots/` folder.

## Suggested filenames

| Filename | Store slot |
|---|---|
| `01-utilities-bar.png` | MPU bar on a PeopleSoft page |
| `02-favorites.png` | Shortcuts / Favorites (optional) |
| `03-page-info.png` | Page Info dialog (optional) |
| `04-field-inspector.png` | Inspect ON + field metadata |
| `05-options.png` | Options → Features |

Aliases like `inspect.png`, `options.png`, or `bar.png` also work.

Blur sensitive IDs before dropping files. Chrome Web Store needs at least one screenshot; three strong shots are enough to submit.
