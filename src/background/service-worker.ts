import { loadSettings, saveSettings } from "../storage/settings";

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get("mpuSettings");
  if (!existing.mpuSettings) {
    const defaults = await loadSettings();
    if (details.reason === "install") {
      defaults.showOnboarding = "Yes";
    }
    await saveSettings(defaults);
  } else if (details.reason === "install") {
    await saveSettings({
      ...(await loadSettings()),
      showOnboarding: "Yes",
    });
  }

  // Strip any leftover legacy credential blobs if present
  const all = await chrome.storage.local.get(null);
  if (Array.isArray(all.psutilEnvs)) {
    const cleaned = all.psutilEnvs.map((e: unknown) => {
      if (!e || typeof e !== "object" || Array.isArray(e)) return e;
      const { creds: _creds, ...rest } = e as Record<string, unknown>;
      return rest;
    });
    await chrome.storage.local.set({ psutilEnvs: cleaned });
  }

  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch {
    /* sidePanel API may be unavailable in older Chrome */
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
