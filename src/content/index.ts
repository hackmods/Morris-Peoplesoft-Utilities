import { detectUiModel, getTargetDocument, parsePsUrl, collectPageMeta } from "../adapters/ps-page";
import { loadSettings, originAllowed, updateSettings } from "../storage/settings";
import { isYes, pushRecentComponent, type MpuSettings } from "../storage/schema";
import {
  mountBar,
  removeBar,
  showPageInfoDialog,
  showGoToComponentDialog,
  announce,
} from "../features/bar";
import {
  isFieldInspectorActive,
  toggleFieldInspector,
  stopFieldInspector,
  getLockedFieldName,
  syncFieldInspectorChrome,
  reinjectFieldInspector,
  copyLockedField,
} from "../features/field-inspector";
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
  const description =
    window.prompt("Favorite description", `${parsed.menu}.${parsed.component}`) ||
    `${parsed.menu}.${parsed.component}`;
  await updateSettings((s) => ({
    ...s,
    favorites: [
      ...s.favorites,
      {
        Servlet: parsed.servlet || "psp",
        Menu: parsed.menu!,
        Component: parsed.component!,
        Market: parsed.market || "GBL",
        Parameters: "",
        Category: "",
        SubCategory: "",
        Description: description,
      },
    ],
  }));
  announce(document, "Favorite added");
  await refresh();
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
  const frame = document.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null;
  if (frameLoadEl && frameLoadHandler) {
    frameLoadEl.removeEventListener("load", frameLoadHandler);
  }
  frameLoadEl = frame;
  frameLoadHandler = onTargetFrameReady;
  if (!frame) return;
  frame.addEventListener("load", onTargetFrameReady);
  if (frame.contentDocument?.body) {
    onTargetFrameReady();
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
    }
  }

  mountBar({
    settings,
    parsed,
    envLabel: label,
    fieldInspectorActive: isFieldInspectorActive(),
    lockedFieldName: getLockedFieldName(),
    traceRunning,
    traceLocked,
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
    onPageInfo: () => showPageInfoDialog(document, parsed, getLockedFieldName()),
    onFieldInspector: () => {
      // Avoid full remount/resizeAll here — it wipes iframe Field Inspector icons.
      toggleFieldInspector(document);
      syncFieldInspectorChrome(document);
    },
    onCopyLockedField: () => {
      void copyLockedField(document);
    },
    onNewWindow: () => openNewWindow(parsed),
    onGoToComponent: () => showGoToComponentDialog(document, parsed),
    onAddFavorite: () => void addFavorite(settings, parsed),
  });

  // Search injects + User ID refresh when Classic target iframe is ready
  if (!loginMode) {
    lastSearchSettings = settings;
    runSearchOptions(settings);
    bindTargetFrameLoad();
  } else {
    lastSearchSettings = null;
  }

  if (isFieldInspectorActive()) {
    reinjectFieldInspector(document);
    syncFieldInspectorChrome(document);
  }

  void detectUiModel();
}

/** Alt+Shift shortcuts — avoid stealing CTRL+J (PeopleSoft System Information). */
function onMpuShortcut(e: KeyboardEvent): void {
  if (!(e.altKey && e.shiftKey) || e.ctrlKey || e.metaKey) return;
  const key = e.key.toLowerCase();
  if (key !== "p" && key !== "i" && key !== "c" && key !== "g") return;
  e.preventDefault();
  if (key === "p") {
    const parsed = parsePsUrl(location.href);
    showPageInfoDialog(document, parsed, getLockedFieldName());
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
  void copyLockedField(document);
}

chrome.runtime.onMessage.addListener((msg: { type?: string; command?: string }) => {
  if (msg.type === "mpu-refresh" || msg.command === "refresh") {
    void refresh();
  }
  if (msg.type === "mpu-trace-sync") {
    void refresh();
  }
});

chrome.storage.onChanged.addListener(() => {
  void refresh();
});

document.addEventListener("keydown", onMpuShortcut, true);

void refresh();
