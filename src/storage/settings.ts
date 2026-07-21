import {
  createDefaultSettings,
  SCHEMA_VERSION,
  type Favorite,
  type FeatureFlags,
  type MpuSettings,
  type TraceSettings,
  type YesNo,
} from "./schema";

const SETTINGS_KEY = "mpuSettings";

/** Legacy PS Utilities keys we may migrate once */
interface LegacyBlob {
  userIdOption?: YesNo;
  greetingOption?: YesNo;
  shortcutsOption?: YesNo;
  traceOption?: YesNo;
  pageInfoOption?: YesNo;
  recFieldInfoOption?: YesNo;
  newWindowOption?: YesNo;
  correctHistoryOption?: YesNo;
  advSearchOption?: YesNo;
  loginPageOption?: YesNo;
  shortcutstable?: Favorite[];
  psutilEnvs?: Array<{
    label?: string;
    active?: YesNo;
    trcProfRunning?: YesNo;
    creds?: unknown;
  }>;
  psutilUrlSites?: MpuSettings["urlSites"];
  psutilTraceSettings?: TraceSettings[];
}

function yn(v: unknown, fallback: YesNo): YesNo {
  return v === "Yes" || v === "No" ? v : fallback;
}

export function migrateFromLegacy(legacy: LegacyBlob, base = createDefaultSettings()): MpuSettings {
  const features: FeatureFlags = {
    ...base.features,
    userIdOption: yn(legacy.userIdOption, base.features.userIdOption),
    greetingOption: yn(legacy.greetingOption, base.features.greetingOption),
    shortcutsOption: yn(legacy.shortcutsOption, base.features.shortcutsOption),
    traceOption: yn(legacy.traceOption, base.features.traceOption),
    pageInfoOption: yn(legacy.pageInfoOption, base.features.pageInfoOption),
    recFieldInfoOption: yn(legacy.recFieldInfoOption, base.features.recFieldInfoOption),
    newWindowOption: yn(legacy.newWindowOption, base.features.newWindowOption),
    correctHistoryOption: yn(legacy.correctHistoryOption, base.features.correctHistoryOption),
    advSearchOption: yn(legacy.advSearchOption, base.features.advSearchOption),
    loginPageOption: yn(legacy.loginPageOption, base.features.loginPageOption),
  };

  const environments =
    legacy.psutilEnvs?.map((e) => ({
      label: e.label ?? "Environment",
      active: yn(e.active, "Yes"),
      trcProfRunning: yn(e.trcProfRunning, "No"),
    })) ?? base.environments;

  return {
    ...base,
    features,
    favorites: Array.isArray(legacy.shortcutstable) ? legacy.shortcutstable : base.favorites,
    environments,
    urlSites: legacy.psutilUrlSites ?? base.urlSites,
    traceSettings: legacy.psutilTraceSettings?.[0]
      ? { ...base.traceSettings, ...legacy.psutilTraceSettings[0] }
      : base.traceSettings,
    schemaVersion: SCHEMA_VERSION,
  };
}

export async function loadSettings(): Promise<MpuSettings> {
  const raw = await chrome.storage.local.get(null);
  if (raw[SETTINGS_KEY] && typeof raw[SETTINGS_KEY] === "object") {
    const s = raw[SETTINGS_KEY] as MpuSettings;
    return {
      ...createDefaultSettings(),
      ...s,
      features: { ...createDefaultSettings().features, ...s.features },
      traceSettings: { ...createDefaultSettings().traceSettings, ...s.traceSettings },
      recentComponents: Array.isArray(s.recentComponents) ? s.recentComponents : [],
      featureUiScopes: {
        ...createDefaultSettings().featureUiScopes,
        ...(s.featureUiScopes || {}),
      },
    };
  }

  // One-time migrate from legacy PS Utilities keys if present
  if (raw.shortcutstable || raw.psutilEnvs || raw.userIdOption) {
    const migrated = migrateFromLegacy(raw as LegacyBlob);
    await saveSettings(migrated);
    return migrated;
  }

  const defaults = createDefaultSettings();
  await saveSettings(defaults);
  return defaults;
}

export async function saveSettings(settings: MpuSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function updateSettings(
  patch: (current: MpuSettings) => MpuSettings,
): Promise<MpuSettings> {
  const current = await loadSettings();
  const next = patch(current);
  await saveSettings(next);
  return next;
}

export function originAllowed(
  pageUrl: string,
  settings: MpuSettings,
): boolean {
  if (settings.features.hostAllowlistEnabled !== "Yes") return true;
  if (!settings.hostAllowlist.length) return false;
  try {
    const origin = new URL(pageUrl).origin;
    return settings.hostAllowlist.some((entry) => {
      try {
        return new URL(entry).origin === origin;
      } catch {
        return entry === origin || pageUrl.startsWith(entry);
      }
    });
  } catch {
    return false;
  }
}
