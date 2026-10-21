# Environment comparisons

Use this workspace for two explicitly chosen captures of browser UI metadata. It cannot compare server PeopleCode, SQL, database contents, configuration exports, security entitlements or unloaded pages.

1. In the first PeopleSoft component, choose **Page Info → Prepare environment snapshot**.
2. Review the metadata and enter a snapshot label. Nothing is stored by preparing the preview. Choose **Save reviewed snapshot**, or Escape/Cancel to discard it.
3. Repeat in the other environment or at another point in time. The metadata retains the portal origin/site and the selected loaded target document’s origin/site when known, capture date, extension version, detected PeopleTools/application release and capture limits. PUM is not captured or verified.
4. Open **Options → Compare environments**. Choose **First snapshot** and **Second snapshot** explicitly, enter a comparison label, and choose **Preview selected comparison**.
5. Review both scopes, dates, versions, observed UI differences and evidence warnings. Choose **Save reviewed comparison** to retain its own two snapshot copies; use **Copy reviewed report** or **Download reviewed report** only after reviewing business context and origins.

Captures include up to 200 field identifiers, 40 structure labels and 40 tab labels from the selected loaded document. They exclude MPU’s own controls. Unloaded tabs and inaccessible frames are not scanned; absent or capped metadata remains uncertain. Differences can reflect different objects, pages or UI modes rather than a customization. A report with no observed UI differences does not establish environment or object equivalence. Oracle patch compatibility requires separate real-system verification.

Storage is local to the Chrome profile and separate from settings/recent visits: up to 50 source snapshots and 25 saved comparisons, within a total 1,000,000-byte serialized cap. No automatic background capture, cross-environment fetch or upload occurs. Snapshot saving is rechecked against the current page, host restrictions, active environment and Page Info setting; disabling Page Info closes the review dialog.

Conflicting writes from another view are rejected while keeping the current report/label. **Reload comparison workspace (clears preview)** explicitly loads the latest records and clears the selection preview. Source snapshots and saved comparisons have separate Delete controls: deleting a source keeps the evidence copies inside saved comparisons; delete those records as well if you need to remove their contents. Settings backups do not include this separate workspace. Exported text reports remain outside extension storage and are not removed on uninstall.
