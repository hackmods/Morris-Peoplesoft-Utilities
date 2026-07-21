import { detectUiModel, parsePsUrl } from "../adapters/ps-page";
import { loadSettings, originAllowed, updateSettings } from "../storage/settings";
import { isYes, type MpuSettings } from "../storage/schema";
import {
  mountBar,
  removeBar,
  showPageInfoDialog,
  announce,
} from "../features/bar";
import {
  isFieldInspectorActive,
  toggleFieldInspector,
  stopFieldInspector,
  getLockedFieldName,
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
  if (!parsed.baseURL || !parsed.servlet) return;
  const site = `${parsed.siteNormalized}_newwin`;
  let path = parsed.href.replace(`/${parsed.site}/`, `/${site}/`);
  if (path === parsed.href && parsed.site) {
    path = parsed.href.replace(parsed.site, site);
  }
  window.open(path, "_blank");
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

  if (parsed.kind === "login" || parsed.kind === "logout") {
    if (!isYes(settings.features.loginPageOption)) {
      removeBar();
      return;
    }
  }

  settings = await ensureEnvRegistration(settings, location.href);
  const { label, index } = resolveEnv(settings, location.href);
  const traceRunning =
    index >= 0 && isYes(settings.environments[index]?.trcProfRunning);

  mountBar({
    settings,
    parsed,
    envLabel: label,
    fieldInspectorActive: isFieldInspectorActive(),
    lockedFieldName: getLockedFieldName(),
    traceRunning,
    traceLocked,
    onTraceToggle: async () => {
      const result = await toggleTrace(settings, parsed, index, !traceRunning);
      traceLocked = result.locked;
      await refresh();
    },
    onPageInfo: () => showPageInfoDialog(document, parsed),
    onFieldInspector: () => {
      toggleFieldInspector(document);
      void refresh();
    },
    onNewWindow: () => openNewWindow(parsed),
    onAddFavorite: () => void addFavorite(settings, parsed),
  });

  runSearchOptions(settings);
  void detectUiModel();
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

void refresh();
