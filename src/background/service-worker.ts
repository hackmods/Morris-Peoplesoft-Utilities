import { createDefaultSettings } from "../storage/schema";
import { loadSettings, saveSettings } from "../storage/settings";

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get("mpuSettings");
  if (!existing.mpuSettings) {
    const defaults = createDefaultSettings();
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
    const cleaned = all.psutilEnvs.map((e: Record<string, unknown>) => {
      const { creds: _creds, ...rest } = e;
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

  if (message?.type === "mpu-open-side-panel") {
    void (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id != null) {
          await chrome.sidePanel.open({ tabId: tab.id });
          sendResponse({ ok: true });
          return;
        }
      } catch {
        /* fall through */
      }
      sendResponse({ ok: false });
    })();
    return true;
  }

  return false;
});
