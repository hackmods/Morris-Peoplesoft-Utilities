# Migrating from PS Utilities

Chrome isolates storage by extension ID. MPU cannot automatically read a separately installed PS Utilities extension's settings. Export favorites from the old extension and import its compatible CSV through MPU Options; recreate environment mappings and feature preferences.

The legacy-key migration only applies when keys (`shortcutstable`, `psutilEnvs`, feature Yes/No flags) already exist in **MPU's own** `chrome.storage.local`, such as a development upgrade under the same extension ID.

- Credentials (`creds`) are never kept
- Re-check feature toggles after migration
- Re-export favorites CSV as a backup
