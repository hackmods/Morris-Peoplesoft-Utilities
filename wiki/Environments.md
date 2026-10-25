# Environments

MPU maps PeopleSoft **base URL + site** pairs to a named environment.

1. Visit a PS site — MPU may prompt for a name (unless Quiet mode).
2. Manage labels, classification, active flag, and accent color under Options → Environments.
3. Disable an environment’s Active flag to hide the bar on those URLs.

Choose **Production**, **Non-production**, or **Unclassified** explicitly. Existing entries remain unclassified; MPU never guesses from names or colors. Production shows a text badge even with greetings off and keeps the toolbar at document top and sticky. Each Field Entry Apply and trace start requires production confirmation. MPU checks access and classification again afterward; changing settings during confirmation cancels it. Trace stop remains available without this confirmation. Normal PeopleSoft validation and save warnings remain in place.

Under **Environment runbooks**, select an environment label and enter a component identifier, title, plain-text notes and optional approved HTTPS links (`label | URL`, one per line). Runbooks remain local to this Chrome profile: up to 100 entries, 4,000 note characters and 12 links each, with a 256,000-byte total serialized storage/export cap. Links open only when selected, without an added page context or referrer. Runbook labels are manual associations; renaming or deleting a settings environment does not redirect a saved runbook to another environment.

Use **Export runbooks** to prepare a separate JSON export; review business context before sharing it. Paste team JSON and choose **Preview import** to review every entry before **Import reviewed runbooks**. Unknown environment labels remain labels only; imports do not create activation rules or URL mappings. Duplicate IDs are rejected, so review and resolve collisions explicitly. Runbooks are separate from the full settings backup.

Concurrent edits report a revision conflict and keep your draft. **Reload runbooks (discard unsaved edits)** explicitly loads the latest saved content; copy any draft you need before reloading. Same-view environment edits appear in the runbook selector when you next open a new or saved entry; reload Options after environment edits in another tab.
