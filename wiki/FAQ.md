# FAQ / Troubleshooting

**Bar missing**  
Confirm you’re on a `psp`/`psc` PeopleSoft URL. Check environment Active flag and host allowlist (if enabled).

**Trace shows lock**  
Your user likely lacks access to UTILITIES PeopleCode/SQL trace components.

**Advanced Search / Correct History did nothing**  
MPU reinjects after Classic TargetContent loads and looks for Fluid search markers too. Controls may still differ by PeopleTools version; enable only where those controls exist.

**Field Inspector noisy**  
Press Escape to exit; turn off in popup toggles. On large grids, expect many orange outlines while Inspect is on — that is intentional; lock turns one field green. Fluid pages wrap tight `ps_box-edit` / single-field control hosts (not shared multi-field containers). Classic pages inside Fluid menus are decorated via nested iframe walk — if icons are missing, wait for TargetContent to finish loading and toggle Inspect again.

**Only one big orange box / wrong container**  
Upgrade to **v1.0.18+**. Shared Fluid `.ps_box-control` and Classic multi-field table cells are wrapped per field; Fluid shells that embed Classic pages decorate nested content documents.

**Store install vs unpacked**  
Prefer Store when available for auto-updates and trusted distribution.

**Roadmap / feature requests**  
BA and developer enhancement ideas are tracked in [`docs/findings/future-enhancements.md`](https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/docs/findings/future-enhancements.md) (no credentials or telemetry features).
