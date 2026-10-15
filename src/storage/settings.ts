import {
  createDefaultSettings,
  SCHEMA_VERSION,
  type Favorite,
  type FeatureFlags,
  type MpuSettings,
  type TraceSettings,
  type YesNo,
} from "./schema";
import { normalizeStoredSettings } from "./backup";
import { SETTINGS_CONFLICT, type SettingsReply, type SettingsWrite } from "./coordinator";

const SETTINGS_KEY = "mpuSettings";
const snapshots = new WeakMap<MpuSettings, MpuSettings>();
let transport = (message: SettingsWrite): Promise<SettingsReply> => chrome.runtime.sendMessage(message);

/** Register the worker's local queue without messaging the worker itself. */
export function configureSettingsTransport(writer: typeof transport): void { transport = writer; }

export class SettingsSaveError extends Error {}

/** A draft retains its original baseline even when a form is left open. */
export function settingsDraft(settings: MpuSettings): MpuSettings {
  const draft = structuredClone(settings);
  snapshots.set(draft, structuredClone(settings));
  return draft;
}

async function write(message: SettingsWrite): Promise<MpuSettings> {
  let reply: SettingsReply;
  try { reply = await transport(message); }
  catch { throw new SettingsSaveError("Settings could not be saved. Reload this view and retry."); }
  if (!reply?.ok) throw new SettingsSaveError(reply?.error || "Settings could not be saved. Please retry.");
  return settingsDraft(reply.settings);
}

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

  const environments = Array.isArray(legacy.psutilEnvs)
    ? legacy.psutilEnvs.map((e) => ({
      label: typeof e?.label === "string" ? e.label : "Environment",
      active: yn(e?.active, "No"),
      trcProfRunning: yn(e?.trcProfRunning, "No"),
    })) : base.environments;

  return normalizeStoredSettings({
    ...base,
    features,
    favorites: Array.isArray(legacy.shortcutstable) ? legacy.shortcutstable : base.favorites,
    environments,
    urlSites: legacy.psutilUrlSites ?? base.urlSites,
    traceSettings: legacy.psutilTraceSettings?.[0]
      ? { ...base.traceSettings, ...legacy.psutilTraceSettings[0] }
      : base.traceSettings,
    schemaVersion: SCHEMA_VERSION,
  });
}

export async function loadSettings(): Promise<MpuSettings> {
  const raw = await chrome.storage.local.get(null);
  if (Object.hasOwn(raw, SETTINGS_KEY)) {
    return settingsDraft(normalizeStoredSettings(raw[SETTINGS_KEY]));
  }

  // One-time migrate from legacy PS Utilities keys if present
  if (raw.shortcutstable || raw.psutilEnvs || raw.userIdOption) {
    const migrated = migrateFromLegacy(raw as LegacyBlob);
    return write({ type: "mpu-write-settings", next: migrated, initialize: true });
  }

  const defaults = createDefaultSettings();
  return write({ type: "mpu-write-settings", next: defaults, initialize: true });
}

export async function saveSettings(settings: MpuSettings, base?: MpuSettings): Promise<MpuSettings> {
  const original = base ?? snapshots.get(settings) ?? await loadSettings();
  const saved = await write({ type: "mpu-write-settings", base: original, next: settings });
  Object.assign(settings, structuredClone(saved));
  snapshots.set(settings, structuredClone(saved));
  return saved;
}

export async function updateSettings(
  patch: (current: MpuSettings) => MpuSettings,
): Promise<MpuSettings> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await loadSettings();
    const base = structuredClone(current);
    try { return await saveSettings(patch(current), base); }
    catch (error) {
      if (!(error instanceof SettingsSaveError) || error.message !== SETTINGS_CONFLICT || attempt === 2) throw error;
    }
  }
  throw new SettingsSaveError(SETTINGS_CONFLICT);
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
        const allowed = new URL(entry);
        return /^(https?:)$/.test(allowed.protocol) && !allowed.username && !allowed.password && allowed.origin === origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
