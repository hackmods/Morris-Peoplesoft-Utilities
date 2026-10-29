import { getExtensionApi } from "../platform/browser";
import { isSettingsBackup, normalizeStoredSettings } from "./backup";
import { RECENT_COMPONENT_LIMIT, recentComponentKey, type MpuSettings, type RecentComponent } from "./schema";

export const SETTINGS_CONFLICT = "Settings changed in another tab. Reload this view and reapply your edit.";
export type SettingsWrite = { type: "mpu-write-settings"; next: MpuSettings; base?: MpuSettings; initialize?: boolean };
export type SettingsReply = { ok: true; settings: MpuSettings } | { ok: false; error: string; conflict?: boolean };

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

function mergeRecentVisits(base: unknown, next: unknown, current: unknown): RecentComponent[] | null {
  if (![base, next, current].every(Array.isArray)) return null;
  const before = base as RecentComponent[];
  const edited = next as RecentComponent[];
  const latest = current as RecentComponent[];
  if (equal(before, edited) || equal(before, latest) || equal(edited, latest)) return null;
  const visit = edited[0];
  if (!visit || typeof visit.visitedAt !== "number") return null;

  // Only special-case the content script's prepend/de-dupe/cap operation.
  // User edits to imported/settings data continue to use atomic collection rules.
  const expectedTail = before
    .filter((entry) => recentComponentKey(entry) !== recentComponentKey(visit))
    .slice(0, RECENT_COMPONENT_LIMIT);
  if (!equal(edited.slice(1), expectedTail)) return null;

  const byKey = new Map<string, RecentComponent>();
  for (const entry of [...before, ...latest, ...edited]) {
    if (!entry || typeof entry !== "object" || typeof entry.visitedAt !== "number") continue;
    const key = recentComponentKey(entry);
    const prior = byKey.get(key);
    if (!prior || entry.visitedAt > prior.visitedAt) byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => b.visitedAt - a.visitedAt).slice(0, RECENT_COMPONENT_LIMIT);
}

/** Three-way merge independent object properties. Collections are atomic: a
 * concurrent reorder/delete must never redirect an edit to another row. */
export function mergeSettingsEdit(base: unknown, next: unknown, current: unknown): unknown {
  if (equal(base, next) || equal(next, current)) return current;
  if (equal(base, current)) return next;
  const recentVisits = mergeRecentVisits(base && object(base) ? base.recentComponents : undefined,
    next && object(next) ? next.recentComponents : undefined,
    current && object(current) ? current.recentComponents : undefined);
  if (object(base) && object(next) && object(current)) {
    const merged: Record<string, unknown> = {};
    // Environment positions and URL mappings form one index namespace. A
    // concurrent mapping addition must not survive a deletion with stale IDs.
    let environmentGroup: Record<string, unknown> | undefined;
    if (Array.isArray(base.environments) && Array.isArray(next.environments) && Array.isArray(current.environments) &&
        (!equal(base.environments, next.environments) || !equal(base.environments, current.environments))) {
      const before = { environments: base.environments, urlSites: base.urlSites };
      const edited = { environments: next.environments, urlSites: next.urlSites };
      const latest = { environments: current.environments, urlSites: current.urlSites };
      if (equal(before, edited) || equal(edited, latest)) environmentGroup = latest;
      else if (equal(before, latest)) environmentGroup = edited;
      else throw new Error(SETTINGS_CONFLICT);
    }
    for (const key of new Set([...Object.keys(base), ...Object.keys(next), ...Object.keys(current)])) {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("Invalid settings property");
      const value = key === "recentComponents" && recentVisits
        ? recentVisits
        : environmentGroup && (key === "environments" || key === "urlSites")
          ? environmentGroup[key]
          : mergeSettingsEdit(base[key], next[key], current[key]);
      if (value !== undefined) merged[key] = value;
    }
    return merged;
  }
  throw new Error(SETTINGS_CONFLICT);
}

let pending: Promise<unknown> = Promise.resolve();

/** Only the service worker calls this in production. Each message is a single
 * awaited read/merge/write; failures do not poison subsequent requests. */
export function coordinateSettingsWrite(message: SettingsWrite): Promise<SettingsReply> {
  const task = pending.then(async (): Promise<SettingsReply> => {
    try {
      if (!isSettingsBackup(message.next) || (message.base !== undefined && !isSettingsBackup(message.base))) {
        return { ok: false, error: "Invalid settings edit" };
      }
      const raw = await getExtensionApi().storage.local.get(null);
      const exists = Object.hasOwn(raw, "mpuSettings");
      const current = normalizeStoredSettings(exists ? raw.mpuSettings : message.next);
      if (message.initialize && exists) return { ok: true, settings: current };
      const merged = message.initialize ? message.next : mergeSettingsEdit(message.base, message.next, exists ? current : message.base);
      if (!isSettingsBackup(merged)) return { ok: false, error: "Invalid merged settings" };
      const settings = normalizeStoredSettings(merged);
      if (!exists || !equal(current, settings)) await getExtensionApi().storage.local.set({ mpuSettings: settings });
      return { ok: true, settings };
    } catch (error) {
      const conflict = error instanceof Error && error.message === SETTINGS_CONFLICT;
      return { ok: false, error: conflict ? SETTINGS_CONFLICT : "Settings could not be saved. Please retry.", conflict };
    }
  });
  pending = task.catch(() => undefined);
  return task;
}
