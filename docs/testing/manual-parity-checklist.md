# Manual parity checklist

Use before tagging a release or uploading to the Chrome Web Store.

## Environments

- [ ] Classic component page — bar mounts
- [ ] Fluid header page — bar mounts without covering global search unusable
- [ ] Navigation Collection iframe — favorites / inspector behave
- [ ] Homepage / worklist / login — expected bar behavior per toggles

## Features

- [ ] User ID displays when comment/meta present
- [ ] Environment label resolves from Options mapping
- [ ] Shortcuts flyout — hierarchical Category » SubCategory » items
- [ ] Add to Shortcuts dialog (Description, Category/SubCategory select-or-new, Parameters)
- [ ] Open shortcut same window and new-window control
- [ ] Favorites CSV import/export (Category/SubCategory preserved)
- [ ] Pages menu lists all tabs; current page highlighted
- [ ] Page Info dialog + copy
- [ ] Customization upgrade watch — capture baseline + check drift (Page Info + Options → Upgrade)
- [ ] Field Inspector on/off + Escape (Classic, Fluid, and Classic page inside Fluid menu/nav)
- [ ] Field Inspector: each field has its own orange border (not one mega container)- [ ] New Window opens `_newwin` style URL
- [ ] Advanced Search expand (where control exists)
- [ ] Correct History select (where control exists; enable in Options)
- [ ] Trace on/off (user with access) and locked state (without access)

## Accessibility

- [ ] Popup fully keyboard operable
- [ ] Options tabs + forms keyboard operable
- [ ] Dialog Escape closes; focus visible
- [ ] Screen reader hears live status for inspect/trace (spot check)

## Compliance

- [ ] Host allowlist off by default
- [ ] Host allowlist on restricts correctly
- [ ] No password fields in UI
- [ ] `npm run release:check` green
