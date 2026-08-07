# Development

```bash
npm ci
npm run generate:icons
npm run generate:store-assets
npm run import:store-screenshots   # after dropping live PNGs in store/assets/screenshots/_inbox/
npm run lint
npm run test:unit
npm run audit
npm run build
npm run package
```

CI runs on pull requests and `main`. Tag `v*` to publish a Release zip. Existing screenshot PNGs are preserved unless `FORCE_STORE_SCREENSHOTS=1`.

## Roadmap / agent knowledge

- Backlog: [`docs/findings/future-enhancements.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/findings/future-enhancements.md)
- Cursor plan: `.cursor/plans/future-enhancements.md`
- Agent guide: `AGENTS.md`
- Cursor rules: `.cursor/rules/` (including `product-roadmap.mdc`)
