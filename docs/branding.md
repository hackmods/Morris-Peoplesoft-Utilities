# Black/orange identity — build 1.0.28

The user requested alignment with UnionOps instead of the prior navy/gold scheme. Observed public CSS on [UnionOps](https://unionops.org/en/) on 2026-10-14: black #1A1A1A, primary orange #EE4E12, filled-action orange #D14510, darker accent #9A3412. This is a palette reference; MPU keeps its own identity and credits.

Extension pages share src/ui/brand.css. Light pages use black text and dark orange links with white-on-orange actions; dark pages use charcoal surfaces and lighter orange text/focus accents. Injected styles remain scoped to MPU elements. Environment colours and functional state cues retain their meaning.

## Icon and assets

store/assets/mpu-peoplesoft-icon-v4.png was edited with the built-in imagegen tool from the prior v3 source, preserving the PS/form/checkmark composition and transparent outer area. The generation prompt requested only navy → #1A1A1A, gold → #EE4E12, white lettering, unchanged geometry and no added text/glow. The generated palette has normal raster shading; CSS tokens use exact values. The prior source is retained.

Run npm run generate:icons to derive the 16/32/48/128 Chrome icons and Store icon from v4. Future promo generation uses the new palette. Never use mock generators to replace genuine screenshots or treat a rendered extension preview as live PeopleSoft validation.

## Remaining validation

Rendered light/dark, keyboard/focus, forced-colour and narrow-view checks accompany UI changes. Automated contrast checks are not accessibility conformance. Real 8.62/assistive-technology checks, updated genuine Store captures and actual host/model prompt trials remain separate release evidence.
