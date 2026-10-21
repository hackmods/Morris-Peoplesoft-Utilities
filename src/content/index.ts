import { detectUiModel, getTargetDocument, parsePsUrl, collectPageMeta, formatFavoriteDescriptionTemplate, formatPageInfoPlain } from "../adapters/ps-page";
import { loadSettings, originAllowed, updateSettings, SettingsSaveError } from "../storage/settings";
import { featureAllowedForUi, isYes, pushRecentComponent, type MpuSettings } from "../storage/schema";
import {
  mountBar,
  removeBar,
  showPageInfoDialog,
  showGoToComponentDialog,
  showPageTabsDialog,
  announce,
} from "../features/bar";
import { showAddFavoriteDialog } from "../features/favorites-ui";
import {
  isFieldInspectorActive,
  toggleFieldInspector,
  stopFieldInspector,
  getLockedFieldName,
  syncFieldInspectorChrome,
  reinjectFieldInspector,
  copyLockedField,
} from "../features/field-inspector";
import { openFieldEntryFromShortcut } from "../features/field-entry-ui";
import type { FieldCopyFormat } from "../storage/schema";
import { toggleTrace } from "../features/trace";
import { runSearchOptions, stopSearchOptions } from "../features/search";
import { clearEligibilityPreview, clearSessionBuffer } from "../features/field-entry";
import "../content/content.css";

window.addEventListener("unhandledrejection", (event) => {
  if (event.reason instanceof SettingsSaveError) { event.preventDefault(); announce(document, event.reason.message); }
});

function resolveEnv(settings: MpuSettings, href: string): { label: string; index: number } {
  const parsed = parsePsUrl(href);
  const map = settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
  if (map && settings.environments[map.envId]) {
    return { label: settings.environments[map.envId].label, index: map.envId };
  }
  return { label: parsed.siteNormalized || "PeopleSoft", index: -1 };
}

const skippedRegistrations = new Set<string>();

async function ensureEnvRegistration(settings: MpuSettings, href: string): Promise<MpuSettings> {
  const parsed = parsePsUrl(href);
  if (!parsed.baseURL || !parsed.siteNormalized) return settings;
  if (settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized]) return settings;
  if (isYes(settings.quietEnvPrompt)) return settings;
  const registrationKey = `${parsed.baseURL}/${parsed.siteNormalized}`;
  if (skippedRegistrations.has(registrationKey)) return settings;

  const answer = window.prompt(
    "Morris PeopleSoft Utilities: name this environment (Cancel to skip)",
    parsed.siteNormalized,
  );
  if (answer === null) { skippedRegistrations.add(registrationKey); return settings; }
  const label = answer.trim() || parsed.siteNormalized;

  return updateSettings((s) => {
    if (s.urlSites[parsed.baseURL]?.[parsed.siteNormalized]) return s;
    const environments = [
      ...s.environments,
      { label, active: "Yes" as const, trcProfRunning: "No" as const },
    ];
    const envId = environments.length - 1;
    const urlSites = { ...s.urlSites };
    urlSites[parsed.baseURL] = {
      ...(urlSites[parsed.baseURL] || {}),
      [parsed.siteNormalized]: { envId },
    };
    return { ...s, environments, urlSites };
  });
}

function openNewWindow(parsed: ReturnType<typeof parsePsUrl>): void {
  if (parsed.kind !== "component" || !parsed.baseURL || !parsed.servlet) {
    announce(document, "New Window is only available on component pages");
    return;
  }

  let menu = parsed.menu;
  let component = parsed.component;
  let market = parsed.market || "GBL";
  try {
    const path = getTargetDocument(document).location?.pathname || "";
    const leaf = path.split("/").pop() || "";
    const parts = leaf.split(".");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      menu = parts[0];
      component = parts[1];
      market = parts[2] || market;
    }
  } catch {
    /* iframe may be mid-navigation */
  }
  if (!menu || !component) {
    announce(document, "Unable to resolve component for New Window");
    return;
  }

  const site = `${parsed.siteNormalized}_newwin`;
  const url = `${parsed.baseURL}/${parsed.servlet}/${site}/${parsed.portal}/${parsed.node}/c/${menu}.${component}.${market}`;
  window.open(url, "_blank");
}

async function addFavorite(settings: MpuSettings, parsed: ReturnType<typeof parsePsUrl>) {
  if (parsed.kind !== "component" || !parsed.menu || !parsed.component) {
    announce(document, "Favorites can only be added from a component page");
    return;
  }
  const meta = collectPageMeta(document);
  const defaultDescription = formatFavoriteDescriptionTemplate(
    meta,
    parsed,
    getLockedFieldName(),
  );

  showAddFavoriteDialog(document, {
    defaultDescription,
    existingFavorites: settings.favorites,
    onSubmit: async (draft) => {
      await updateSettings((s) => ({
        ...s,
        favorites: [
          ...s.favorites,
          {
            Servlet: parsed.servlet || "psp",
            Menu: parsed.menu!,
            Component: parsed.component!,
            Market: parsed.market || "GBL",
            Parameters: draft.Parameters || "",
            Category: draft.Category || "",
            SubCategory: draft.SubCategory || "",
            Description: draft.Description,
            ...(draft.Notes.trim() ? { Notes: draft.Notes.trim() } : {}),
          },
        ],
      }));
      announce(
        document,
        draft.Notes.trim() ? "Shortcut added with notes" : "Shortcut added",
      );
      await refresh();
    },
  });
}

let traceLocked = false;
let frameLoadEl: HTMLIFrameElement | null = null;
let frameLoadHandler: (() => void) | null = null;
let lastSearchSettings: MpuSettings | null = null;
let activeSettings: MpuSettings | null = null;
let lastRecordedComponent = "";

function suspendPage(): void {
  activeSettings = null;
  lastSearchSettings = null;
  stopSearchOptions();
  removeBar();
  stopFieldInspector();
  clearEligibilityPreview(document);
  clearSessionBuffer();
  document.getElementById("mpu-dialog")?.remove();
  if (frameLoadEl && frameLoadHandler) frameLoadEl.removeEventListener("load", frameLoadHandler);
  frameLoadEl = null;
}

function onTargetFrameReady(): void {
  const user = document.querySelector(".mpu-user");
  if (user) {
    const meta = collectPageMeta(document);
    user.textContent = meta.userId ? `User: ${meta.userId}` : "User: —";
  }
  if (lastSearchSettings) {
    runSearchOptions(lastSearchSettings);
  }
  if (isFieldInspectorActive()) {
    reinjectFieldInspector(document);
    syncFieldInspectorChrome(document);
  }
}

function bindTargetFrameLoad(): void {
  const frame =
    (document.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
    (document.querySelector('iframe[name="TargetContent"]') as HTMLIFrameElement | null) ||
    (document.querySelector(".ps_target-iframe") as HTMLIFrameElement | null);
  if (frameLoadEl && frameLoadHandler) {
    frameLoadEl.removeEventListener("load", frameLoadHandler);
  }
  frameLoadEl = frame;
  frameLoadHandler = onTargetFrameReady;
  if (!frame) return;
  frame.addEventListener("load", onTargetFrameReady);
  if (frame.contentDocument?.body) {
    onTargetFrameReady();
    // Nested nav-collection / Classic-in-Fluid iframe may load after outer shell
    const nested =
      (frame.contentDocument.querySelector(".ps_target-iframe") as HTMLIFrameElement | null) ||
      (frame.contentDocument.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
      (frame.contentDocument.querySelector(
        'iframe[name="TargetContent"]',
      ) as HTMLIFrameElement | null);
    nested?.addEventListener("load", onTargetFrameReady);
  }
}

async function refreshPage(): Promise<void> {
  let settings = await loadSettings();
  if (!originAllowed(location.href, settings)) {
    suspendPage();
    return;
  }

  const parsed = parsePsUrl(location.href);
  if (parsed.kind === "unknown") { suspendPage(); return; }

  const envActive = (() => {
    const { index } = resolveEnv(settings, location.href);
    if (index < 0) return true;
    return isYes(settings.environments[index]?.active);
  })();

  if (!envActive) {
    suspendPage();
    return;
  }

  const loginMode = parsed.kind === "login" || parsed.kind === "logout";
  if (loginMode && !isYes(settings.features.loginPageOption)) {
    suspendPage();
    return;
  }

  settings = await ensureEnvRegistration(settings, location.href);
  const { label, index } = resolveEnv(settings, location.href);
  if (loginMode && index >= 0 && settings.environments[index]?.traceRequest && settings.environments[index].traceRequest?.status !== "unknown") {
    settings = await updateSettings((s) => {
      const request = s.environments[index]?.traceRequest;
      if (request) s.environments[index].traceRequest = { ...request, status: "unknown" };
      return s;
    });
  }
  const traceRunning =
    index >= 0 && isYes(settings.environments[index]?.trcProfRunning);

  const uiMode = detectUiModel(document);
  const scopes = settings.featureUiScopes || {};
  const effective: MpuSettings = {
    ...settings,
    features: {
      ...settings.features,
      recFieldInfoOption:
        isYes(settings.features.recFieldInfoOption) &&
        featureAllowedForUi(scopes.recFieldInfoOption, uiMode)
          ? settings.features.recFieldInfoOption
          : "No",
      advSearchOption:
        isYes(settings.features.advSearchOption) &&
        featureAllowedForUi(scopes.advSearchOption, uiMode)
          ? settings.features.advSearchOption
          : "No",
      correctHistoryOption:
        isYes(settings.features.correctHistoryOption) &&
        featureAllowedForUi(scopes.correctHistoryOption, uiMode)
          ? settings.features.correctHistoryOption
          : "No",
      fieldEntryOption:
        isYes(settings.features.fieldEntryOption) &&
        featureAllowedForUi(scopes.fieldEntryOption, uiMode)
          ? settings.features.fieldEntryOption
          : "No",
    },
  };
  activeSettings = loginMode ? null : effective;
  if ((!isYes(effective.features.traceOption) && document.getElementById("mpu-trace-title")) ||
      (!isYes(effective.features.pageInfoOption) && document.getElementById("mpu-pi-title"))) {
    document.getElementById("mpu-dialog")?.remove();
  }
  if (!isYes(effective.features.fieldEntryOption)) {
    clearSessionBuffer();
    clearEligibilityPreview(document);
    if (document.querySelector('#mpu-dialog [id^="mpu-fe-"]')) document.getElementById("mpu-dialog")?.remove();
  }

  // PI-04: record component visits locally (skip if already top to avoid churn)
  if (
    !loginMode &&
    parsed.kind === "component" &&
    parsed.menu &&
    parsed.component &&
    parsed.baseURL &&
    parsed.portal &&
    parsed.node
  ) {
    const entry = {
      Servlet: (parsed.servlet || "psp") as "psp" | "psc",
      Menu: parsed.menu,
      Component: parsed.component,
      Market: parsed.market || "GBL",
      Portal: parsed.portal,
      Node: parsed.node,
      Site: parsed.site || parsed.siteNormalized,
      visitedAt: Date.now(),
    };
    const top = settings.recentComponents?.[0];
    const same =
      top &&
      top.Menu === entry.Menu &&
      top.Component === entry.Component &&
      top.Market === entry.Market &&
      top.Site === entry.Site;
    const visitKey = `${entry.Menu}.${entry.Component}.${entry.Market}@${entry.Site}`;
    if (!same && lastRecordedComponent !== visitKey) {
      lastRecordedComponent = visitKey;
      settings = await updateSettings((s) => ({
        ...s,
        recentComponents: pushRecentComponent(s.recentComponents || [], entry),
      }));
      effective.recentComponents = settings.recentComponents;
    }
    lastRecordedComponent = visitKey;
  }

  // If Inspect is out of scope for this UI, stop an active session
  if (!isYes(effective.features.recFieldInfoOption) && isFieldInspectorActive()) {
    stopFieldInspector(document);
  }

  mountBar({
    settings: effective,
    parsed,
    envLabel: label,
    fieldInspectorActive: isFieldInspectorActive(),
    lockedFieldName: getLockedFieldName(),
    traceRunning,
    traceRequest: index >= 0 ? settings.environments[index]?.traceRequest : undefined,
    traceLocked,
    traceSettings: effective.traceSettings,
    loginMode,
    onTraceToggle: async () => {
      const result = await toggleTrace(settings, parsed, index, !traceRunning);
      traceLocked = result.locked;
      if (result.locked) {
        announce(
          document,
          "Trace locked — missing security access to UTILITIES PeopleCode/SQL Trace components",
        );
      }
      await refresh();
    },
    onTraceRequest: async (turnOn) => {
      const result = await toggleTrace(await loadSettings(), parsed, index, turnOn);
      traceLocked = result.locked;
      await refresh();
    },
    onPageInfo: () => showPageInfoDialog(document, parsed, getLockedFieldName(), label),
    onFieldInspector: () => {
      if (!isYes(effective.features.recFieldInfoOption)) {
        announce(document, "Field Inspector disabled for this UI mode in Options");
        return;
      }
      toggleFieldInspector(document);
      syncFieldInspectorChrome(document);
    },
    onCopyLockedField: (format?: FieldCopyFormat) => {
      void copyLockedField(document, format || settings.fieldCopyFormat || "record.field");
    },
    onNewWindow: () => openNewWindow(parsed),
    onGoToComponent: () => showGoToComponentDialog(document, parsed),
    onPageTabs: () => showPageTabsDialog(document),
    onAddFavorite: () => void addFavorite(settings, parsed),
  });

  // Search injects + User ID refresh when Classic target iframe is ready
  if (!loginMode) {
    lastSearchSettings = effective;
    runSearchOptions(effective);
    bindTargetFrameLoad();
  } else {
    lastSearchSettings = null;
    stopSearchOptions();
  }

  if (isFieldInspectorActive() && isYes(effective.features.recFieldInfoOption)) {
    reinjectFieldInspector(document);
    syncFieldInspectorChrome(document);
  }
}

// Coalesce storage/broadcast refreshes; never mount from concurrent stale snapshots.
let refreshing = false;
let refreshPending = false;
async function refresh(): Promise<void> {
  refreshPending = true;
  if (refreshing) return;
  refreshing = true;
  try {
    while (refreshPending) {
      refreshPending = false;
      await refreshPage();
    }
  } finally {
    refreshing = false;
  }
}

/** Alt+Shift shortcuts — avoid stealing CTRL+J (PeopleSoft System Information). */
function onMpuShortcut(e: KeyboardEvent): void {
  if (!activeSettings || document.getElementById("mpu-dialog")) return;
  if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
  const key = e.key.toLowerCase();
  if (key !== "p" && key !== "i" && key !== "c" && key !== "g" && key !== "e") return;
  if (key === "p" && !isYes(activeSettings.features.pageInfoOption)) return;
  if ((key === "i" || key === "c") && !isYes(activeSettings.features.recFieldInfoOption)) return;
  if (key === "e" && !isYes(activeSettings.features.fieldEntryOption)) return;
  e.preventDefault();
  if (key === "p") {
    const parsed = parsePsUrl(location.href);
    void (async () => {
      const s = await loadSettings();
      const { label: envLabel } = resolveEnv(s, location.href);
      showPageInfoDialog(document, parsed, getLockedFieldName(), envLabel);
    })();
    return;
  }
  if (key === "i") {
    toggleFieldInspector(document);
    syncFieldInspectorChrome(document);
    return;
  }
  if (key === "g") {
    showGoToComponentDialog(document, parsePsUrl(location.href));
    return;
  }
  if (key === "e") {
    void openFieldEntryFromShortcut(document);
    return;
  }
  void (async () => {
    const s = await loadSettings();
    const sel = document.getElementById("mpu-copy-format") as HTMLSelectElement | null;
    const format = (sel?.value || s.fieldCopyFormat || "record.field") as FieldCopyFormat;
    await copyLockedField(document, format);
  })();
}

chrome.runtime.onMessage.addListener((msg: { type?: string; command?: string }, _sender, sendResponse) => {
  if (msg.type === "mpu-activation-status" && _sender.id === chrome.runtime.id) {
    sendResponse({ active: !!activeSettings && !!document.getElementById("mpu-bar"), loginOnly: !activeSettings && !!document.getElementById("mpu-bar") });
    return false;
  }
  if (msg.type === "mpu-refresh" || msg.command === "refresh") {
    void refresh();
  }
  if (msg.type === "mpu-trace-sync") {
    void refresh();
  }
  if (msg.type === "mpu-page-info-snapshot") {
    if (!activeSettings || !isYes(activeSettings.features.pageInfoOption)) {
      sendResponse({ text: "MPU Page Info is disabled for this page." });
      return false;
    }
    const parsed = parsePsUrl(location.href);
    const text = formatPageInfoPlain(collectPageMeta(document), parsed, getLockedFieldName());
    sendResponse({ text });
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.mpuSettings) return;
  activeSettings = null;
  lastSearchSettings = null;
  stopSearchOptions();
  void refresh();
});

document.addEventListener("keydown", onMpuShortcut, true);

void refresh();
