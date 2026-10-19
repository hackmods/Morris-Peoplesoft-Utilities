# Agent guide — Morris PeopleSoft Utilities

This repository is a **Chrome Manifest V3 extension** for PeopleSoft productivity.

## Compatibility and evidence

- Primary target: **PeopleTools 8.62**. PeopleTools version is separate from the PeopleSoft application release / PUM image; do not call the application “PeopleSoft 8.56.”
- Support Classic/Classic Plus, Fluid, Classic-in-Fluid, navigation collections, and same-origin modal frames. Use the owning document's DOM realm or shared guards in `src/adapters/dom.ts`; top-window `instanceof HTMLElement` fails for iframe elements.
- Synthetic fixtures are regression tests, not proof of compatibility with an Oracle patch level. Record real-system verification in `docs/testing/peopletools-8.62.md`.
- Consult Oracle's 8.62 documentation for version-specific behavior. Do not invent delivered component IDs, trace checkbox IDs, security roles, buffer paths, or database keys.
- An HTML `$0` suffix is not a PeopleCode row number or scroll path. Generated snippets must state their required event/row context.

## Safe implementation boundaries

- Host allowlist, environment activation, feature toggles, and Classic/Fluid scopes apply to buttons, shortcuts, delayed callbacks, and side-panel messages. Disabling must cancel retries and clear active helpers.
- Trace requests stay on the current origin; never follow a form action/redirect to a different host with session tokens. Partial failure must never be reported as “Trace stopped.”
- Field Entry is opt-in. Preview must not add rows, submit, save, or execute business actions. Revalidate connectivity, editability, visibility, value, and select choices at Apply; skip ambiguous targets and credentials.
- Validate imported JSON before writing storage; whitelist schema properties. Preserve CSV/TSV quoting, newlines, and blank cells.
- Recover malformed saved settings without writing repairs during reads. Preserve environment array indices because URL mappings reference them; unreadable host restrictions must fail closed.
- Dialogs need focus containment, Escape after typing, focus restoration, and cleanup on every close path. Automated axe checks do not establish AODA/WCAG conformance.
- Menu changes must retain arrow/Home/End navigation, submenu Left/Right, Escape focus return and Tab exit. Keep search inputs outside ARIA menus. Run rendered browser axe checks, including contrast, for dynamic UI changes.
- Keep recent-visit writes independent of settings refresh to avoid cross-tab write loops. Test multi-tab behavior when changing storage lifecycle.
- Build before auditing/package inspection. `npm run package` audits the fresh manifest; run `npm run test:e2e` separately. Never weaken coverage gates to pass a fix.
- Check screenshot provenance in `store/assets/README.md`. Do not overwrite reviewed artwork with generators during CI/release or claim PeopleTools validation from mock images or extension Options captures.
- Keep changes reviewable in the working tree; publication, store submission, and real-system testing require their own explicit task context.

## Read relevant context

Start with the requested outcome and existing evidence. Use targeted searches and read only the documents relevant to the change; this list is a map, not a mandatory reading queue. Preserve supplied context and prior authorization. Use one agent for small or sequential tasks; use authorized delegation only for independent questions whose benefit justifies the added context and coordination.

- Plan intent: official Chrome Web Store listing, BA + tech parity, AODA, no credentials/telemetry
- **Future enhancements (BA + developers):** `docs/findings/future-enhancements.md` · Cursor plan: `.cursor/plans/future-enhancements.md`
- ADRs: `docs/adr/`
- Findings: `docs/findings/legacy-ps-utilities-audit.md`, `docs/findings/classic-tools-audit.md`
- Cursor rules: `.cursor/rules/` (includes `product-roadmap.mdc`)
- Legacy oracle (local only, gitignored): `.reference/PS-Utilities`
- A maintainer may supply a separate legacy checkout (for this review: sibling `../ps-utilities/4.2.1_0`). Use it read-only as a behavior reference. Confirm licensing before copying source; do not carry over bundled libraries, credentials, analytics, or manifest identity.
- **PeopleSoft agent prompt pack (separate side toolkit, not shipped in the extension):** `agents/README.md` — generic Cursor/VS Copilot/Claude prompts (`review-*`, `assist-*` including SQL + IB/CI, `design-*`, `guide-*`). Keep it generic — no site-specific customizations/role names checked in here.
- The extension may bundle the generated public reference catalog (titles/descriptions/paths) for Options → Agents. Full prompt bodies and host exports stay in the separate toolkit. Generate metadata with `npm run generate:agents`; never fetch/execute remote prompts or send PeopleSoft page data to AI services through this reference feature.

## Commands

```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run audit
npm run build
npm run package
npm run release:check
```

E2E loads the unpacked extension from `dist/` (see `tests/e2e/README.md`). Not part of `release:check`.

## Do not

- Edit plan files under `.cursor/plans` unless asked (roadmap plan is maintained when enhancing the backlog)
- Commit `.reference/` or private keys
- Add analytics or password features
