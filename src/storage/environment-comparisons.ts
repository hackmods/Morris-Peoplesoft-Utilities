import { getExtensionApi } from "../platform/browser";
import type { PageFingerprint, MpuSettings } from "./schema";
import { loadSettings, originAllowed } from "./settings";
import { isYes } from "./schema";
import { parsePsUrl } from "../adapters/ps-page";

export const ENVIRONMENT_COMPARISON_STORAGE_KEY = "mpuEnvironmentComparisons";
export const ENVIRONMENT_COMPARISON_MESSAGE = "mpu-environment-comparisons";
export const ENVIRONMENT_SNAPSHOT_LIMIT = 50;
export const ENVIRONMENT_COMPARISON_LIMIT = 25;
export const ENVIRONMENT_COMPARISON_STORE_LIMIT = 1_000_000;
const STRING_LIMIT = 200;

export interface EnvironmentSnapshot {
  id: string;
  label: string;
  environment: string;
  origin: string;
  site: string;
  targetOrigin: string;
  targetSite: string;
  captureWarnings: string[];
  capturedAt: number;
  extensionVersion: string;
  applicationRelease: string;
  fingerprint: PageFingerprint;
}
export interface SavedEnvironmentComparison {
  id: string;
  label: string;
  savedAt: number;
  left: EnvironmentSnapshot;
  right: EnvironmentSnapshot;
}
export interface EnvironmentComparisonStore {
  revision: number;
  snapshots: EnvironmentSnapshot[];
  comparisons: SavedEnvironmentComparison[];
}
export type EnvironmentComparisonMutation =
  | { type: typeof ENVIRONMENT_COMPARISON_MESSAGE; action: "addSnapshot"; baseRevision: number; snapshot: EnvironmentSnapshot }
  | { type: typeof ENVIRONMENT_COMPARISON_MESSAGE; action: "saveComparison"; baseRevision: number; id: string; label: string; leftId: string; rightId: string }
  | { type: typeof ENVIRONMENT_COMPARISON_MESSAGE; action: "deleteSnapshot" | "deleteComparison"; baseRevision: number; id: string };
export type EnvironmentComparisonReply =
  | { ok: true; store: EnvironmentComparisonStore }
  | { ok: false; error: string; conflict?: boolean };

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const keysOnly = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const safeId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const text = (value: unknown, limit = STRING_LIMIT, allowEmpty = true): value is string =>
  typeof value === "string" && value.length <= limit && (allowEmpty || value.trim().length > 0)
  && !Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
const validDate = (value: unknown): value is number => typeof value === "number" && Number.isFinite(new Date(value).getTime());
const validOrigin = (value: unknown, allowEmpty = false): value is string => {
  if (allowEmpty && value === "") return true;
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password
      && url.origin === value && url.pathname === "/" && !url.search && !url.hash;
  } catch { return false; }
};
const validSite = (value: unknown, allowEmpty = false): value is string =>
  allowEmpty && value === "" || typeof value === "string" && /^[a-zA-Z0-9._-]{1,100}$/.test(value);

export function validatePageFingerprint(value: unknown): PageFingerprint | null {
  if (!object(value) || !keysOnly(value, [
    "menu", "component", "market", "page", "toolsRel", "uiMode", "tabLabels", "structureLabels", "fieldIds",
    "fieldIdsComplete", "fieldIdsTotal", "structureLabelsComplete", "pageMetadataComplete",
  ])) return null;
  const scalarKeys = ["menu", "component", "market", "page", "toolsRel", "uiMode"] as const;
  if (scalarKeys.some((key) => !text(value[key]))) return null;
  const validArray = (entry: unknown, max: number): entry is string[] =>
    Array.isArray(entry) && entry.length <= max && entry.every((item) => text(item, STRING_LIMIT, false));
  if (!validArray(value.tabLabels, 40) || !validArray(value.structureLabels, 40) || !validArray(value.fieldIds, 200)) return null;
  for (const key of ["fieldIdsComplete", "structureLabelsComplete", "pageMetadataComplete"]) {
    if (Object.hasOwn(value, key) && typeof value[key] !== "boolean") return null;
  }
  if (Object.hasOwn(value, "fieldIdsTotal") && (!Number.isSafeInteger(value.fieldIdsTotal) || (value.fieldIdsTotal as number) < value.fieldIds.length || (value.fieldIdsTotal as number) > 1_000_000)) return null;
  if (value.fieldIdsComplete === true && typeof value.fieldIdsTotal === "number" && value.fieldIdsTotal !== value.fieldIds.length) return null;
  return {
    menu: value.menu as string, component: value.component as string, market: value.market as string,
    page: value.page as string, toolsRel: value.toolsRel as string, uiMode: value.uiMode as string,
    tabLabels: [...value.tabLabels], structureLabels: [...value.structureLabels], fieldIds: [...value.fieldIds],
    ...(typeof value.fieldIdsComplete === "boolean" ? { fieldIdsComplete: value.fieldIdsComplete } : {}),
    ...(typeof value.fieldIdsTotal === "number" ? { fieldIdsTotal: value.fieldIdsTotal } : {}),
    ...(typeof value.structureLabelsComplete === "boolean" ? { structureLabelsComplete: value.structureLabelsComplete } : {}),
    ...(typeof value.pageMetadataComplete === "boolean" ? { pageMetadataComplete: value.pageMetadataComplete } : {}),
  };
}

export function validateEnvironmentSnapshot(value: unknown): EnvironmentSnapshot | null {
  if (!object(value) || !keysOnly(value, [
    "id", "label", "environment", "origin", "site", "targetOrigin", "targetSite", "captureWarnings",
    "capturedAt", "extensionVersion", "applicationRelease", "fingerprint",
  ])) return null;
  if (!safeId(value.id) || !text(value.label, 120, false) || !text(value.environment, 120, false)
    || !validOrigin(value.origin) || !validSite(value.site) || !validOrigin(value.targetOrigin, true)
    || !validSite(value.targetSite, true) || !Array.isArray(value.captureWarnings) || value.captureWarnings.length > 10
    || !value.captureWarnings.every((warning) => text(warning, 250, false)) || !validDate(value.capturedAt)
    || !text(value.extensionVersion, 40) || !text(value.applicationRelease, 120)) return null;
  const fingerprint = validatePageFingerprint(value.fingerprint);
  if (!fingerprint) return null;
  return {
    id: value.id, label: value.label.trim(), environment: value.environment.trim(), origin: value.origin,
    site: value.site, targetOrigin: value.targetOrigin, targetSite: value.targetSite,
    captureWarnings: [...value.captureWarnings], capturedAt: value.capturedAt,
    extensionVersion: value.extensionVersion, applicationRelease: value.applicationRelease, fingerprint,
  };
}

function validateSavedComparison(value: unknown): SavedEnvironmentComparison | null {
  if (!object(value) || !keysOnly(value, ["id", "label", "savedAt", "left", "right"])
    || !safeId(value.id) || !text(value.label, 120, false) || !validDate(value.savedAt)) return null;
  const left = validateEnvironmentSnapshot(value.left);
  const right = validateEnvironmentSnapshot(value.right);
  if (!left || !right || left.id === right.id) return null;
  return { id: value.id, label: value.label.trim(), savedAt: value.savedAt, left, right };
}

export function normalizeEnvironmentComparisonStore(value: unknown): EnvironmentComparisonStore {
  if (!object(value)) return { revision: 0, snapshots: [], comparisons: [] };
  const revision = Number.isSafeInteger(value.revision) && (value.revision as number) >= 0 ? value.revision as number : 0;
  const snapshots: EnvironmentSnapshot[] = [];
  const snapshotIds = new Set<string>();
  if (Array.isArray(value.snapshots)) for (const raw of value.snapshots.slice(0, ENVIRONMENT_SNAPSHOT_LIMIT)) {
    const snapshot = validateEnvironmentSnapshot(raw);
    if (snapshot && !snapshotIds.has(snapshot.id)) { snapshotIds.add(snapshot.id); snapshots.push(snapshot); }
  }
  const comparisons: SavedEnvironmentComparison[] = [];
  const comparisonIds = new Set<string>();
  if (Array.isArray(value.comparisons)) for (const raw of value.comparisons.slice(0, ENVIRONMENT_COMPARISON_LIMIT)) {
    const comparison = validateSavedComparison(raw);
    if (comparison && !comparisonIds.has(comparison.id)) { comparisonIds.add(comparison.id); comparisons.push(comparison); }
  }
  return { revision, snapshots, comparisons };
}

function withinStoreLimit(value: EnvironmentComparisonStore): boolean {
  return new TextEncoder().encode(JSON.stringify(value)).length <= ENVIRONMENT_COMPARISON_STORE_LIMIT;
}

export async function loadEnvironmentComparisons(): Promise<EnvironmentComparisonStore> {
  try {
    const raw = await getExtensionApi().storage.local.get(ENVIRONMENT_COMPARISON_STORAGE_KEY);
    return normalizeEnvironmentComparisonStore(raw[ENVIRONMENT_COMPARISON_STORAGE_KEY]);
  } catch { throw new Error("Environment comparisons could not be loaded. Please retry."); }
}

export async function requestEnvironmentComparisonMutation(message: EnvironmentComparisonMutation): Promise<EnvironmentComparisonStore> {
  let reply: EnvironmentComparisonReply;
  try { reply = await getExtensionApi().runtime.sendMessage(message); }
  catch { throw new Error("Environment comparisons could not be saved. Please retry."); }
  if (!reply?.ok) throw new Error(reply?.error || "Environment comparisons could not be saved. Please retry.");
  return normalizeEnvironmentComparisonStore(reply.store);
}

function validMutation(value: unknown): value is EnvironmentComparisonMutation {
  if (!object(value) || value.type !== ENVIRONMENT_COMPARISON_MESSAGE || !Number.isSafeInteger(value.baseRevision) || (value.baseRevision as number) < 0) return false;
  if (value.action === "addSnapshot") return keysOnly(value, ["type", "action", "baseRevision", "snapshot"]) && Object.keys(value).length === 4 && !!validateEnvironmentSnapshot(value.snapshot);
  if (value.action === "saveComparison") return keysOnly(value, ["type", "action", "baseRevision", "id", "label", "leftId", "rightId"])
    && Object.keys(value).length === 7 && safeId(value.id) && text(value.label, 120, false) && safeId(value.leftId) && safeId(value.rightId) && value.leftId !== value.rightId;
  return (value.action === "deleteSnapshot" || value.action === "deleteComparison")
    && keysOnly(value, ["type", "action", "baseRevision", "id"]) && Object.keys(value).length === 4 && safeId(value.id);
}

function copyMutation(value: unknown): EnvironmentComparisonMutation | null {
  if (!validMutation(value)) return null;
  if (value.action === "addSnapshot") return { type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: value.baseRevision, snapshot: validateEnvironmentSnapshot(value.snapshot)! };
  if (value.action === "saveComparison") return {
    type: ENVIRONMENT_COMPARISON_MESSAGE, action: "saveComparison", baseRevision: value.baseRevision,
    id: value.id, label: value.label.trim(), leftId: value.leftId, rightId: value.rightId,
  };
  return { type: ENVIRONMENT_COMPARISON_MESSAGE, action: value.action, baseRevision: value.baseRevision, id: value.id };
}

function exactExtensionPage(sender: chrome.runtime.MessageSender, page: string): boolean {
  if (sender.id !== getExtensionApi().runtime.id || !sender.url) return false;
  try {
    const actual = new URL(sender.url);
    const expected = new URL(getExtensionApi().runtime.getURL(page));
    return actual.protocol === expected.protocol && actual.host === expected.host && actual.pathname === "/" + page
      && !actual.username && !actual.password;
  } catch { return false; }
}

function captureSender(sender: chrome.runtime.MessageSender, snapshot: EnvironmentSnapshot): boolean {
  if (sender.id !== getExtensionApi().runtime.id || sender.tab?.id === undefined || sender.frameId !== 0 || !sender.url || sender.url !== sender.tab.url) return false;
  const parsed = parsePsUrl(sender.url);
  return parsed.kind === "component" && parsed.origin === snapshot.origin && parsed.siteNormalized === snapshot.site;
}

function snapshotAllowedBySettings(snapshot: EnvironmentSnapshot, senderUrl: string, settings: MpuSettings): boolean {
  const parsed = parsePsUrl(senderUrl);
  if (parsed.kind !== "component" || parsed.origin !== snapshot.origin || parsed.siteNormalized !== snapshot.site
    || !originAllowed(senderUrl, settings) || !isYes(settings.features.pageInfoOption)) return false;
  const mapping = settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
  if (!mapping) return true;
  return isYes(settings.environments[mapping.envId]?.active)
    && settings.environments[mapping.envId]?.label === snapshot.environment;
}

export function registerEnvironmentComparisonStorage(): void {
  let pending: Promise<unknown> = Promise.resolve();
  getExtensionApi().runtime.onMessage.addListener((message: unknown, sender, respond: (reply: EnvironmentComparisonReply) => void) => {
    if (!object(message) || message.type !== ENVIRONMENT_COMPARISON_MESSAGE) return;
    const mutation = copyMutation(message);
    const isCapture = mutation?.action === "addSnapshot";
    const validSender = isCapture && mutation
      ? captureSender(sender, mutation.snapshot)
      : exactExtensionPage(sender, "options.html");
    if (!mutation || !validSender) { respond({ ok: false, error: "Invalid environment comparison request." }); return; }
    const senderUrl = sender.url!;
    const tabId = isCapture ? sender.tab!.id! : undefined;
    const task = pending.then(async (): Promise<EnvironmentComparisonReply> => {
      try {
        let settings: MpuSettings | null = null;
        let currentTab: chrome.tabs.Tab | undefined;
        if (isCapture) {
          currentTab = await getExtensionApi().tabs.get(tabId!);
          settings = await loadSettings();
          if (currentTab.url !== senderUrl || !snapshotAllowedBySettings((mutation as Extract<EnvironmentComparisonMutation, { action: "addSnapshot" }>).snapshot, senderUrl, settings)) {
            return { ok: false, error: "Snapshot capture is no longer allowed for the current page or environment." };
          }
        }
        const current = await loadEnvironmentComparisons();
        if (mutation.baseRevision !== current.revision) return { ok: false, conflict: true, error: "Environment comparisons changed in another view. Reload and review before saving." };
        let snapshots = [...current.snapshots];
        let comparisons = [...current.comparisons];
        if (mutation.action === "addSnapshot") {
          const snapshot = validateEnvironmentSnapshot(mutation.snapshot)!;
          if (snapshots.some((item) => item.id === snapshot.id)) return { ok: false, error: "Snapshot ID already exists." };
          if (snapshots.length >= ENVIRONMENT_SNAPSHOT_LIMIT) return { ok: false, error: "The 50 snapshot limit has been reached." };
          snapshots.push(snapshot);
        } else if (mutation.action === "saveComparison") {
          if (comparisons.some((item) => item.id === mutation.id)) return { ok: false, error: "Comparison ID already exists." };
          if (comparisons.length >= ENVIRONMENT_COMPARISON_LIMIT) return { ok: false, error: "The 25 saved comparison limit has been reached." };
          const left = snapshots.find((item) => item.id === mutation.leftId);
          const right = snapshots.find((item) => item.id === mutation.rightId);
          if (!left || !right || left.id === right.id) return { ok: false, error: "Choose two different saved snapshots." };
          comparisons.push({ id: mutation.id, label: mutation.label.trim(), savedAt: Date.now(), left: structuredClone(left), right: structuredClone(right) });
        } else if (mutation.action === "deleteSnapshot") {
          if (!snapshots.some((item) => item.id === mutation.id)) return { ok: false, error: "Snapshot was not found." };
          snapshots = snapshots.filter((item) => item.id !== mutation.id);
        } else {
          if (!comparisons.some((item) => item.id === mutation.id)) return { ok: false, error: "Saved comparison was not found." };
          comparisons = comparisons.filter((item) => item.id !== mutation.id);
        }
        const next = { revision: current.revision + 1, snapshots, comparisons };
        if (!withinStoreLimit(next)) return { ok: false, error: "Environment comparison data would exceed the 1 MB limit." };
        if (isCapture) {
          const [latestTab, latestSettings] = await Promise.all([getExtensionApi().tabs.get(tabId!), loadSettings()]);
          const latestSnapshot = (mutation as Extract<EnvironmentComparisonMutation, { action: "addSnapshot" }>).snapshot;
          if (latestTab.url !== senderUrl || !snapshotAllowedBySettings(latestSnapshot, senderUrl, latestSettings)) {
            return { ok: false, error: "Snapshot capture is no longer allowed for the current page or environment." };
          }
        }
        await getExtensionApi().storage.local.set({ [ENVIRONMENT_COMPARISON_STORAGE_KEY]: next });
        return { ok: true, store: next };
      } catch { return { ok: false, error: "Environment comparisons could not be saved. Please retry." }; }
    });
    pending = task.catch(() => undefined);
    void task.then(respond);
    return true;
  });
}
