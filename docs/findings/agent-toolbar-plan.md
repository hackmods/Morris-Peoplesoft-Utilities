# Agent library toolbar plan

## Outcome

Make the separate PeopleSoft specialist toolkit discoverable from the actual toolbar, with a useful local library in the side panel and Options. The extension remains a reference and task-brief aid: it does not execute agents or send page data to AI services.

## Implementation

1. Add an Agents toolbar action and popup entry. Open the side panel's Agents view from a user gesture, with an Options fallback. Preserve host/environment access guards and recheck delayed fallback navigation.
2. Reuse the library UI across Options and side panel. Add audience filters, common task shortcuts, favorites, recents, and clear instructions/download/brief actions. Keep existing side-panel Favorites and Page Info available; Agents must not automatically request a page snapshot.
3. Store only known favorite/recent agent IDs and onboarding dismissal in a separate local key. Serialize mutations through the background worker so independent tabs cannot overwrite each other. Never save searches or brief contents.
4. Show the bundled catalog version and explicit links to public instructions and release downloads. Load no remote prompts or documentation automatically. Briefs request only task-relevant context and targeted evidence.
5. Verify storage races, access guards, failure handling, keyboard interaction, rendered contrast in both themes, and 320 px reflow. Run lint, coverage, build/audits, and unpacked-extension browser tests; prepare the next package.

## Release boundary

Keep implementation reviewable in the working tree. Packaging does not establish real PeopleTools compatibility or Chrome Web Store publication. Preserve existing testing evidence and reviewed store artwork.

## Implementation result — 2026-10-19

Implemented using three Sol agents for toolbar access, local preferences and shared library UI. Prepared extension 1.0.31 and the separate prompt-content 4.2.0 ZIP. Lint, 284 coverage-suite tests, 25 Chromium extension tests and accessibility/store/compliance audits passed. Coverage gates remain unchanged (84.38% lines). Browser tests include cross-view writes, explicit clipboard fallback, no automatic page snapshot, light/dark contrast and 320 px reflow. These are synthetic regression checks, not a live PeopleTools compatibility claim or Store submission.
