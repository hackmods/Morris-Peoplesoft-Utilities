# Migrating from PS Utilities

On first run, if legacy keys (`shortcutstable`, `psutilEnvs`, feature Yes/No flags) exist in `chrome.storage.local`, MPU migrates them into `mpuSettings`.

- Credentials (`creds`) are never kept
- Re-check feature toggles after migration
- Re-export favorites CSV as a backup
