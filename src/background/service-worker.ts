import { createDefaultSettings } from "../storage/schema";
import { loadSettings, saveSettings } from "../storage/settings";

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get("mpuSettings");
  if (!existing.mpuSettings) {
    await saveSettings(createDefaultSettings());
  }

  // Strip any leftover legacy credential blobs if present
  const all = await chrome.storage.local.get(null);
  if (Array.isArray(all.psutilEnvs)) {
    const cleaned = all.psutilEnvs.map(
      (e: Record<string, unknown>) => {
        const { creds: _creds, ...rest } = e;
        return rest;
      },
    );
    await chrome.storage.local.set({ psutilEnvs: cleaned });
  }

  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "mpu-trace-sync" || message?.type === "mpu-refresh") {
    void chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        if (tab.id === undefined) continue;
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          /* tab without content script */
        });
      }
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "mpu-get-settings") {
    void loadSettings().then((s) => sendResponse(s));
    return true;
  }

  return false;
});
