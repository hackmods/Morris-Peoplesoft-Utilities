import { detectUiModel, getTargetDocument, parsePsUrl, collectPageMeta, formatFavoriteDescriptionTemplate, formatPageInfoPlain } from "../adapters/ps-page";
import { loadSettings, originAllowed, updateSettings } from "../storage/settings";
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
import type { FieldCopyFormat } from "../storage/schema";
import { toggleTrace } from "../features/trace";
import { runSearchOptions } from "../features/search";
import "../content/content.css";

function resolveEnv(settings: MpuSettings, href: string): { label: string; index: number } {
  const parsed = parsePsUrl(href);
  const map = settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
  if (map && settings.environments[map.envId]) {
    return { label: settings.environments[map.envId].label, index: map.envId };
  }
  return { label: parsed.siteNormalized || "PeopleSoft", index: -1 };
}

async function ensureEnvRegistration(settings: MpuSettings, href: string): Promise<MpuSettings> {
  const parsed = parsePsUrl(href);
  if (!parsed.baseURL || !parsed.siteNormalized) return settings;
  if (settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized]) return settings;
  if (isYes(settings.quietEnvPrompt)) return settings;

  const label =
    window.prompt(
      "Morris PeopleSoft Utilities: name this environment (Cancel to skip)",
      parsed.siteNormalized,
    ) || parsed.siteNormalized;

  return updateSettings((s) => {
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

async function refresh(): Promise<void> {
  let settings = await loadSettings();
  if (!originAllowed(location.href, settings)) {
    removeBar();
    stopFieldInspector();
    return;
  }

  const parsed = parsePsUrl(location.href);
  if (parsed.kind === "unknown") return;

  const envActive = (() => {
    const { index } = resolveEnv(settings, location.href);
    if (index < 0) return true;
    return isYes(settings.environments[index]?.active);
  })();

  if (!envActive) {
    removeBar();
    return;
  }

  const loginMode = parsed.kind === "login" || parsed.kind === "logout";
  if (loginMode && !isYes(settings.features.loginPageOption)) {
    removeBar();
    return;
  }

  settings = await ensureEnvRegistration(settings, location.href);
  const { label, index } = resolveEnv(settings, location.href);
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
    },
  };

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
    if (!same) {
      settings = await updateSettings((s) => ({
        ...s,
        recentComponents: pushRecentComponent(s.recentComponents || [], entry),
      }));
      effective.recentComponents = settings.recentComponents;
    }
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
  }

  if (isFieldInspectorActive() && isYes(effective.features.recFieldInfoOption)) {
    reinjectFieldInspector(document);
    syncFieldInspectorChrome(document);
  }
}

/** Alt+Shift shortcuts — avoid stealing CTRL+J (PeopleSoft System Information). */
function onMpuShortcut(e: KeyboardEvent): void {
  if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
  const key = e.key.toLowerCase();
  if (key !== "p" && key !== "i" && key !== "c" && key !== "g") return;
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
  void (async () => {
    const s = await loadSettings();
    const sel = document.getElementById("mpu-copy-format") as HTMLSelectElement | null;
    const format = (sel?.value || s.fieldCopyFormat || "record.field") as FieldCopyFormat;
    await copyLockedField(document, format);
  })();
}

chrome.runtime.onMessage.addListener((msg: { type?: string; command?: string }, _sender, sendResponse) => {
  if (msg.type === "mpu-refresh" || msg.command === "refresh") {
    void refresh();
  }
  if (msg.type === "mpu-trace-sync") {
    void refresh();
  }
  if (msg.type === "mpu-page-info-snapshot") {
    const parsed = parsePsUrl(location.href);
    const text = formatPageInfoPlain(collectPageMeta(document), parsed, getLockedFieldName());
    sendResponse({ text });
    return true;
  }
});

chrome.storage.onChanged.addListener(() => {
  void refresh();
});

document.addEventListener("keydown", onMpuShortcut, true);

void refresh();
