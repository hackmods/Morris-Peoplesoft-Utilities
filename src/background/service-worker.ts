import { configureSettingsTransport, loadSettings, saveSettings, originAllowed } from "../storage/settings";
import { coordinateSettingsWrite, type SettingsWrite } from "../storage/coordinator";
import { parsePsUrl } from "../adapters/ps-page";
import { isYes, type MpuSettings } from "../storage/schema";
import { registerAgentLibraryStorage } from "./agent-library-storage";

configureSettingsTransport(coordinateSettingsWrite);
registerAgentLibraryStorage();

// Validate synchronously so sidePanel.open retains the content click's user gesture.
// Invalidate immediately on storage changes; pending loads cannot restore stale access.
let agentAccessSettings: MpuSettings | null = null;
let agentAccessRevision = 0;
let agentAccessReady: Promise<void>;
function refreshAgentAccess(): void {
  const revision = ++agentAccessRevision;
  agentAccessSettings = null;
  agentAccessReady = loadSettings().then((settings) => {
    if (revision === agentAccessRevision) agentAccessSettings = settings;
  }).catch(() => undefined);
}
refreshAgentAccess();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.mpuSettings) refreshAgentAccess();
});

function agentsSenderAllowed(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || sender.tab?.id === undefined || sender.frameId !== 0
    || !sender.url || sender.url !== sender.tab.url || !agentAccessSettings) return false;
  const parsed = parsePsUrl(sender.url);
  if (["unknown", "login", "logout"].includes(parsed.kind)
    || !originAllowed(sender.url, agentAccessSettings)) return false;
  const mapping = agentAccessSettings.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
  return !mapping || isYes(agentAccessSettings.environments[mapping.envId]?.active);
}

function openAgentLibrary(sender: chrome.runtime.MessageSender, respond: (result: unknown) => void): void {
  if (!agentsSenderAllowed(sender)) { respond({ ok: false }); return; }
  const tabId = sender.tab!.id!;
  const revision = agentAccessRevision;
  const fallback = async (): Promise<void> => {
    // A failed open must not create a late Options tab after disable or navigation.
    const tab = await chrome.tabs.get(tabId);
    if (revision !== agentAccessRevision || tab.url !== sender.url || !agentsSenderAllowed(sender)) {
      respond({ ok: false }); return;
    }
    await chrome.tabs.create({ url: chrome.runtime.getURL("options.html#agents") });
    respond({ ok: true, destination: "options" });
  };
  try {
    if (!chrome.sidePanel?.open || !chrome.sidePanel?.setOptions) throw new Error("Side panel unavailable");
    // Queue configuration first, but never await it before open: Chrome requires user activation.
    const configured = chrome.sidePanel.setOptions({ tabId, path: "sidepanel.html#agents", enabled: true });
    const opened = chrome.sidePanel.open({ tabId });
    void Promise.all([configured, opened]).then(() => respond({ ok: true, destination: "sidepanel" }))
      .catch(() => fallback().catch(() => respond({ ok: false })));
  } catch {
    void fallback().catch(() => respond({ ok: false }));
  }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  const existing = await chrome.storage.local.get("mpuSettings");
  if (!existing.mpuSettings) {
    const defaults = await loadSettings();
    if (details.reason === "install") {
      defaults.showOnboarding = "Yes";
    }
    await saveSettings(defaults);
  } else if (details.reason === "install") {
    const settings = await loadSettings();
    settings.showOnboarding = "Yes";
    await saveSettings(settings);
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "mpu-open-agents") {
    if (!agentAccessSettings) {
      // A cold worker may need storage first. If Chrome expires activation, the
      // guarded Options fallback still makes this first click useful.
      void agentAccessReady.then(() => openAgentLibrary(sender, sendResponse));
    } else openAgentLibrary(sender, sendResponse);
    return true;
  }
  if (message?.type === "mpu-write-settings") {
    if (sender.id !== chrome.runtime.id) { sendResponse({ ok: false, error: "Untrusted settings sender" }); return false; }
    void coordinateSettingsWrite(message as SettingsWrite).then(sendResponse);
    return true;
  }
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
