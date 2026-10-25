# Customization upgrade watch

The upgrade watch helps you record a component's browser-visible structure before a PeopleTools change and check it again afterward. It compares UI fingerprints only. It does not inspect SQL definitions or compare PeopleCode, and a clean result does not certify an upgrade.

## Capture a baseline

1. Open the PeopleSoft component and choose **Page Info** from the MPU bar.
2. Open **Customization upgrade watch**. Review the component and environment shown in the dialog.
3. Enter optional notes before capturing if you need to record patch or environment context, then choose **Capture baseline**. MPU saves the current component identity, available page metadata, UI mode, tab labels, up to 40 structure hosts, and up to 200 unique field IDs from the current loaded page. Unloaded tabs are not captured.
4. The saved fingerprint records optional `fieldIdsComplete`, `fieldIdsTotal`, and `structureLabelsComplete` metadata. A field scan is incomplete only when it finds more than 200 unique IDs; exactly 200 is complete. Structure metadata is complete at 40 hosts and becomes capped above 40. During comparison, MPU warns when either capture is incomplete, has no field IDs, lacks page metadata, or has legacy/unknown or capped structure metadata. Older captures without completeness metadata are treated as unknown and warned about.

Captures are stored with MPU settings on this device. Keep the same component and environment context when recording the post-change state.

## Check for changes

After the upgrade, open the same component and return to **Page Info → Customization upgrade watch**. Select the baseline to compare, then choose **Check upgrade drift**. The report warns if the active page or UI mode differs, and flags incomplete or legacy capture metadata so a clean result is not inferred from missing evidence. It also identifies changes in ToolsRel, tabs, structure hosts, and captured field IDs; use it as a triage aid for deciding what to review.

Use **Copy upgrade handoff** to copy the observed UI differences and reviewer checklist for App Designer / Change Assistant evidence, dependencies, regression testing, and rollback. Complete those sections with independently verified evidence. MPU does not generate or run a Change Assistant project.

## Manage and transfer captures

Open **Options → Upgrade** to review saved watches and import or export watch data. Select **Replace existing watches on import** when you want imported data to replace the saved list. Imports and existing captures are subject to MPU's retained-history limits: at most five baselines per component/environment and 50 overall. Exports can contain component names, field IDs, environment labels, and notes; review the file before sharing it.

## Limits and verification

The comparison is based on the browser UI/DOM fingerprint. It does not compare SQL, PeopleCode, App Designer definitions, security, or server-side behavior. Use App Designer Compare Report or Change Assistant, plus application testing, for those checks.

The reported Fluid navigation-collection save warning still needs real-system regression. On a fresh unchanged page, compare search helpers off and on while opening the affected collection and navigating between its pages; then repeat with a genuine unsaved edit. Unedited navigation should not acquire a save prompt from MPU, and PeopleSoft should retain its normal warning for genuine edits. Record the PeopleTools patch and sanitized outcome in [the 8.62 validation record](../testing/peopletools-8.62.md). Synthetic browser fixtures do not verify this behavior.
