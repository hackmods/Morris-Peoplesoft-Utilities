# Public PeopleSoft page evidence

## Candidate registry — user supplied, 2026-10-20

The following links are references for future manual, read-only testing. Their current reachability, PeopleTools patches and extension compatibility have **not** been verified. Public accessibility does not establish permission to stress-test, submit applications, or create accounts. Do not add these sites to a user's allowlist automatically. Screenshots must record whether MPU was actually present and which build/settings were used.

| Organization | Candidate URL |
|---|---|
| City of Surrey | https://careers.surrey.ca/psc/CAREERS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| Miami-Dade County | https://jobs.miamidade.gov/psc/JOBS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| State of North Dakota | https://www.cnd.nd.gov/psc/recruit/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| Peel Regional Police | https://careers.peelpolice.ca/psc/HR92RECP/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| The Ottawa Hospital | https://jobposting.ottawahospital.on.ca/psc/jobposting/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| SickKids Hospital | https://career.sickkids.ca:8001/psc/CRHCMPRD/CAREER/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| University of Pretoria | https://www1.up.ac.za/psc/career/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| Florida State University | https://jobs.omni.fsu.edu/psc/sprdhr_er/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| UC Berkeley | https://careerspub.universityofcalifornia.edu/psc/ucb/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| Toronto Metropolitan University | https://careers.torontomu.ca/psc/hrcgprd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| Region of Durham | https://recruitregion.durham.ca/psc/recruit_rmd/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| City of Calgary | https://recruiting.calgary.ca/psc/hcm/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| London Health Sciences Centre | https://careers.lhsc.on.ca/psc/LHCGWPRD/EMPLOYEE/CAREERS_EXT/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |
| National Geospatial-Intelligence Agency | https://careers.nga.mil/psp/CAREERS/EMPLOYEE/HRMS/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U |

Path anatomy: `/{psp|psc}/{site}/{portal}/{node}/c/{menu}.{component}.{market}`. For example, `sprdhr_er`, `ucb`, `recruit_rmd`, `hcm`, `LHCGWPRD` and `hrcgprd` are **site** names, not nodes. `EMPLOYEE` or `CAREER` is the portal; `HRMS`, `PSFT_HR` or `CAREERS_EXT` is the node. Preserve explicit ports in origins and allowlist entries. URL parser fixtures establish parsing only, not live compatibility.

For each future visit record: date; starting URL (without session tokens); redirect outcome; observed UI/frame layout; Tools patch if actually exposed; extension version/settings; exact read-only actions; observed save prompt or absence; screenshot path/provenance; unresolved questions. Keep user reports separate from independently observed outcomes.

## Niagara Region careers — 2026-10-20

User-supplied public page: [Niagara Region careers job search](https://careers.niagararegion.ca/psc/careers/EMPLOYEE/PSFT_HR/c/HRS_HRAM_FL.HRS_CG_SEARCH_FL.GBL?Page=HRS_APP_SCHJOB_FL&Action=U&).

- **User reported:** Fluid side navigation reproduces a save warning while using the extension.
- **Observed in this task:** a dedicated in-app browser subsequently opened the unauthenticated Careers page. Its accessibility/DOM view exposed `PT_WRAPPER`, `HRS_CG_SEARCH_FL`, Home/Actions/More Actions controls, the Search Jobs field `HRS_SCH_WRK_HRS_SCH_TEXT100`, and search button `HRS_SCH_WRK_FLU_HRS_SEARCH_BTN`. The side navigation exposed `NAV_PB$0` (View All Jobs), `NAV_PB$1` (My Job Notifications), and entries through `NAV_PB$5` (My Account). This is real public-page evidence of the Fluid careers layout and side navigation. The page redirected into its public Applicant flow. No extension bar was visible in that browser.
- **Access limitations:** an earlier dedicated Chrome request failed because Chrome was unavailable, and a read-only web fetch returned HTTP 502. The successful in-app observation supersedes that access failure for layout evidence only.
- **Navigation observation:** selecting View All Jobs returned the supplied Search Jobs page. Its left facet panel was `win0divPT_PANEL2_CONTAIN`, with expanded Location/Department/Job Family controls and More links `PTS_MORE$0` / `PTS_MORE$1`. No save prompt appeared on that navigation in the in-app browser, where MPU was absent. These generic More links are concrete public markup against which search-helper exclusion should be tested; observing them alone does not establish that they caused the user's warning.
- **Reference screenshot:** `store/assets/submission/niagara-public-fluid-reference.png` captures the public Fluid page only. It is not evidence of the extension running or a verified warning fix. Consult `store/assets/README.md` for artwork provenance before reusing it.
- **Not established:** actual PeopleTools release/patch, sidebar transaction ownership, warning cause, whether the extension changes dirty state, live search-helper target selection, or compatibility of the new diagnostic on this site. The observed Fluid layout does not establish the PeopleTools version.
- **No business actions performed:** no job searches submitted, applications created, account changes, or form edits. Public-page screenshots may document the rendered layout if captured separately; they must not be presented as live extension testing or proof of a save-warning fix.

The new diagnostic has synthetic regression coverage for Fluid markers, same-origin targets, visible dialog owners, hidden/ambiguous/inaccessible frames, privacy, and traversal limits. Those fixtures do not establish Oracle patch-level compatibility or reproduce the reported warning. Real-system verification belongs in `peopletools-8.62.md` once performed. The diagnostic intentionally reads only structural markers and reports uncertainty; it does not determine unsaved changes or execute navigation.

To investigate the warning, compare a fresh explicit diagnostic before opening navigation, with navigation open, and after closing it. Record the owning documents and ambiguity without copying field values, tokens, identifiers, or complete session URLs. Confirm the search-helper's selected controls against the actual rendered page before attributing a cause.

## Browser access checkpoint — 2026-10-21

Chrome was available, but creation of the dedicated dashboard tab was denied (`Not allowed`); desktop computer use subsequently stopped because it could not confidently determine the current browser URL for policy enforcement. No further browser input was attempted. Niagara's enabled/disabled comparison, live extension diagnostic and extension-on-page screenshots remain unperformed. No new public-page capture or compatibility evidence was obtained. All 14 other sites remain unverified candidates.

Later, at the user's request, testing used native local-window computer use without the Chrome MCP connector. Accessibility reading of Chrome's New Tab window succeeded and exposed the MPU toolbar button; the installed version was not established. Screenshot capture failed (`FrameArrived timed out`). Two navigation input attempts, separated by a refreshed window inventory/accessibility state, failed with `failed to activate captured window`. No navigation occurred, and input retries stopped. This adds no Niagara test result, Store status or screenshot. The user was asked to foreground the local window while independent implementation continued.
