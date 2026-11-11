# Manual parity checklist

Use before tagging a release or uploading to the Chrome Web Store. The primary target is PeopleTools 8.62; record results in [the 8.62 checklist](peopletools-8.62.md).

## Environments

- [ ] Classic component page — bar mounts
- [ ] Fluid header page — bar mounts without covering global search unusable
- [ ] Navigation Collection iframe — favorites / inspector behave
- [ ] Homepage / worklist / login — expected bar behavior per toggles

## Features

- [ ] User ID appears in Environment details when enabled and metadata is available
- [ ] Environment label resolves from Options mapping
- [ ] Default toolbar shows Find page, Find field, and More; specialist tools stay inside More
- [ ] Find page searches recent components, saved shortcuts, and pages in the current component
- [ ] Find page → Go to a component opens direct Menu.Component navigation
- [ ] Add current component to Shortcuts dialog (Description, Category/SubCategory select-or-new, Parameters)
- [ ] Open recent or saved destinations in the current or a new window
- [ ] Favorites CSV import/export (Category/SubCategory preserved)
- [ ] Find field searches current-page labels and IDs, locates a result, and copies the configured field format
- [ ] Toolbar Inspect toggles detailed field markers and Escape stops it; selected field details and copy controls remain visible outside More
- [ ] Saved-shortcut categories expand inline by click; ArrowRight enters, ArrowLeft/Escape returns, and moving the pointer away does not collapse them
- [ ] More → Admin jumps opens the selected setup component
- [ ] Page Info dialog + copy
- [ ] Customization upgrade watch — capture baseline + check drift (Page Info + Options → Upgrade)
- [ ] More menu keyboard navigation, focus return, Escape, and Tab exit work in Classic and Fluid
- [ ] Field Inspector icons/highlights do not change page layout when menus or content expand
- [ ] Login page bar is off by default and follows its Options toggle
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
