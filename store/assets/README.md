# Store assets — 1.0.30

Current artwork uses `#FF5C00`, black, neutral grays and white.
The icon source is `mpu-peoplesoft-icon-v5.png`, recolored from the user-supplied
`ChatGPT Image Oct 18, 2026, 04_21_16 PM.png`. Previous v3/v4 images are historical
sources, not current release assets. `npm run generate:icons` produces all Chrome
icon sizes and the 128px store icon from v5, preserving transparency.

The two promotional tiles are marketing illustrations (the marquee includes a
clearly fictional demo), not compatibility evidence. Regenerate only promos with
`GENERATE_STORE_ONLY=promo-small-440x280.png,promo-marquee-1400x560.png` when running
`npm run generate:store-assets`.

## Genuine screenshots

Run `npm run build` then `npx tsx scripts/capture-orange-release.ts`. The five
1280×800 images are actual packaged Options UI captures in a fresh Chromium
profile, without personal records. Legacy filenames remain for tooling stability:

| Filename | Actual content |
|---|---|
| screenshots/01-utilities-bar.png | Features |
| screenshots/02-favorites.png | Favorites |
| screenshots/03-page-info.png | Tracing |
| screenshots/04-field-inspector.png | Agents |
| screenshots/05-options.png | Host allowlist |

`submission/1.0.30/` contains matching captures plus light/dark visual QA views.
These screenshots demonstrate extension UI, not real PeopleTools compatibility.
The `.live-captures` marker prevents mock generation from replacing them.

## Icon edit provenance

Built-in image generation, October 18, 2026. Prompt: "Edit only the colors of the
supplied icon. Preserve exact PS lettering, two form rows, checkmark,
rounded-square geometry, composition, and transparent outer margin. Replace navy
blue tile with near-black #111111, cream PS letters with pure white #FFFFFF, and
ALL gold/yellow form outlines, field marks, horizontal lines and checkmark with
vivid orange #FF5C00. Flat clean colors, no blue, no yellow, no new objects or
lettering. This is the same icon recolored for the user's approved
orange/black/gray/white app palette."

## Public reference capture — 2026-10-20

`submission/niagara-public-fluid-reference.png` is a genuine in-app browser screenshot of the public Niagara Region Careers Search Jobs page, captured after selecting View All Jobs, without sign-in or application submission. It shows no MPU extension. It is a layout reference only, not a replacement store screenshot or proof of live extension/PeopleTools-patch compatibility. User-reported save-warning reproduction remains distinct from this observation. Capture the actual extension in a browser where it is loaded before creating promotional live-use screenshots from this site.
