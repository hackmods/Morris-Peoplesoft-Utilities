import { configureSidebar, getExtensionApi, openSidebar } from "../platform/browser";
import { configureSettingsTransport, loadSettings, saveSettings, originAllowed } from "../storage/settings";
import { coordinateSettingsWrite, type SettingsWrite } from "../storage/coordinator";
import { parsePsUrl } from "../adapters/ps-page";
import { featureAllowedForUi, isYes, type MpuSettings } from "../storage/schema";
import { registerAgentLibraryStorage } from "./agent-library-storage";
import { registerRunbookStorage } from "../storage/runbooks";
import { registerEnvironmentComparisonStorage } from "../storage/environment-comparisons";

configureSettingsTransport(coordinateSettingsWrite);
registerAgentLibraryStorage();
registerRunbookStorage();
registerEnvironmentComparisonStorage();

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
getExtensionApi().storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.mpuSettings) refreshAgentAccess();
});

function agentsSenderAllowed(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== getExtensionApi().runtime.id || sender.tab?.id === undefined || sender.frameId !== 0
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
    const tab = await getExtensionApi().tabs.get(tabId);
    if (revision !== agentAccessRevision || tab.url !== sender.url || !agentsSenderAllowed(sender)) {
      respond({ ok: false }); return;
    }
    await getExtensionApi().tabs.create({ url: getExtensionApi().runtime.getURL("options.html#agents") });
    respond({ ok: true, destination: "options" });
  };
  try {
    void openSidebar(tabId, "sidepanel.html#agents").then(() => respond({ ok: true, destination: "sidepanel" }))
      .catch(() => fallback().catch(() => respond({ ok: false })));
  } catch {
    void fallback().catch(() => respond({ ok: false }));
  }
}

getExtensionApi().runtime.onInstalled.addListener(async (details) => {
  const existing = await getExtensionApi().storage.local.get("mpuSettings");
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
  const all = await getExtensionApi().storage.local.get(null);
  if (Array.isArray(all.psutilEnvs)) {
    const cleaned = all.psutilEnvs.map((e: unknown) => {
      if (!e || typeof e !== "object" || Array.isArray(e)) return e;
      const { creds: _creds, ...rest } = e as Record<string, unknown>;
      return rest;
    });
    await getExtensionApi().storage.local.set({ psutilEnvs: cleaned });
  }

  try {
    await configureSidebar();
  } catch {
    /* A browser may not expose a sidebar in this context. */
  }

  if (details.reason === "install") {
    getExtensionApi().runtime.openOptionsPage();
  }
});

getExtensionApi().runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "mpu-open-reference") {
    void (async () => {
      await agentAccessReady;
      if (!["help", "pcode"].includes(message.source) || !["docs", "agents"].includes(message.destination)
        || (message.source === "help" && message.destination !== "docs")
        || !["classic", "fluid", "navCollection", "unknown"].includes(message.uiMode)
        || typeof message.tools !== "string" || (message.tools !== "" && !/^\d{1,2}\.\d{1,2}(?:\.\d{1,3})?$/.test(message.tools))) return { ok: false };
      const allowed = () => agentsSenderAllowed(sender) && (message.source === "help"
        || isYes(agentAccessSettings?.features.pageInfoOption)
        || (isYes(agentAccessSettings?.features.recFieldInfoOption)
          && featureAllowedForUi(agentAccessSettings?.featureUiScopes.recFieldInfoOption, message.uiMode)));
      if (!allowed()) return { ok: false };
      const revision = agentAccessRevision;
      const tab = await getExtensionApi().tabs.get(sender.tab!.id!);
      if (revision !== agentAccessRevision || tab.url !== sender.url || !allowed()) return { ok: false };
      const query = message.destination === "docs" ? `?tools=${encodeURIComponent(message.tools)}` : "";
      await getExtensionApi().tabs.create({ url: getExtensionApi().runtime.getURL(`options.html${query}#${message.destination}`) });
      return { ok: true };
    })().then(sendResponse).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === "mpu-open-scheduler" || message?.type === "mpu-open-ib") {
    const route = message.type === "mpu-open-ib" ? "ib" : "scheduler";
    void (async () => {
      await agentAccessReady;
      if (!agentsSenderAllowed(sender) || !isYes(agentAccessSettings?.features.pageInfoOption)) return { ok: false };
      const revision = agentAccessRevision;
      const tab = await getExtensionApi().tabs.get(sender.tab!.id!);
      if (revision !== agentAccessRevision || tab.url !== sender.url || !agentsSenderAllowed(sender)
        || !isYes(agentAccessSettings?.features.pageInfoOption)) return { ok: false };
      // Fixed local route only; no caller-supplied URL, ticket text or page data.
      await getExtensionApi().tabs.create({ url: getExtensionApi().runtime.getURL(`options.html#${route}`) });
      return { ok: true };
    })().then(sendResponse).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === "mpu-open-agents") {
    if (!agentAccessSettings) {
      // A cold worker may need storage first. If Chrome expires activation, the
      // guarded Options fallback still makes this first click useful.
      void agentAccessReady.then(() => openAgentLibrary(sender, sendResponse));
    } else openAgentLibrary(sender, sendResponse);
    return true;
  }
  if (message?.type === "mpu-write-settings") {
    if (sender.id !== getExtensionApi().runtime.id) { sendResponse({ ok: false, error: "Untrusted settings sender" }); return false; }
    void coordinateSettingsWrite(message as SettingsWrite).then(sendResponse);
    return true;
  }
  if (message?.type === "mpu-trace-sync" || message?.type === "mpu-refresh") {
    void getExtensionApi().tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id === undefined) continue;
        getExtensionApi().tabs.sendMessage(tab.id, message).catch(() => {
          /* tab without content script */
        });
      }
    }).catch(() => undefined);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "mpu-get-settings") {
    void loadSettings().then((s) => sendResponse(s));
    return true;
  }

  return false;
});
