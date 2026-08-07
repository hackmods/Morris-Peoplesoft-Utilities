# Manual parity checklist

Use before tagging a release or uploading to the Chrome Web Store.

## Environments

- [x] Classic component page — bar mounts
- [x] Fluid header page — bar mounts without covering global search unusable
- [x] Navigation Collection iframe — favorites / inspector behave
- [x] Homepage / worklist / login — expected bar behavior per toggles

## Features

- [x] User ID displays when comment/meta present
- [x] Environment label resolves from Options mapping
- [x] Shortcuts flyout — hierarchical Category » SubCategory » items
- [x] Add to Shortcuts dialog (Description, Category/SubCategory select-or-new, Parameters)
- [x] Open shortcut same window and new-window control
- [x] Favorites CSV import/export (Category/SubCategory preserved)
- [x] Pages menu lists all tabs; current page highlighted
- [x] Page Info dialog + copy
- [x] Customization upgrade watch — capture baseline + check drift (Page Info + Options → Upgrade)
- [x] Field Inspector on/off + Escape (Classic, Fluid, and Classic page inside Fluid menu/nav)
- [x] Field Inspector: each field has its own orange border (not one mega container)
- [x] New Window opens `_newwin` style URL
- [x] Advanced Search expand (where control exists)
- [x] Correct History select (where control exists; enable in Options)
- [x] Trace on/off (user with access) and locked state (without access)

## Accessibility

- [x] Popup fully keyboard operable
- [x] Options tabs + forms keyboard operable
- [x] Dialog Escape closes; focus visible
- [x] Screen reader hears live status for inspect/trace (spot check)

## Compliance

- [x] Host allowlist off by default
- [x] Host allowlist on restricts correctly
- [x] No password fields in UI
- [x] `npm run release:check` green
