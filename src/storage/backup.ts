import { createDefaultSettings, normalizeWatchHistory, type MpuSettings } from "./schema";

type Check = (v: unknown) => boolean;
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const str: Check = (v) => typeof v === "string";
const num: Check = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const timestamp: Check = (v) => num(v) && Number.isFinite(new Date(v as number).getTime());
const yn: Check = (v) => v === "Yes" || v === "No";
const oneOf = (...values: string[]): Check => (v) => typeof v === "string" && values.includes(v);
const array = (check: Check): Check => (v) => Array.isArray(v) && v.every(check);
const shape = (fields: Record<string, Check>, required = Object.keys(fields)): Check => (v) =>
  object(v) && required.every((k) => Object.hasOwn(v, k)) &&
  Object.entries(v).every(([k, value]) => Object.hasOwn(fields, k) && fields[k](value));
const strings = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, str]));
const favoriteFields = {
  ...strings(["Menu", "Component", "Market", "Parameters", "Category", "SubCategory", "Description", "Notes"]),
  Servlet: oneOf("psp", "psc"), pinned: (v: unknown) => typeof v === "boolean",
};
const favorite = shape(favoriteFields, ["Servlet", "Menu", "Component", "Market", "Parameters", "Category", "SubCategory", "Description"]);
const row = shape({ ...strings(["record", "field", "value", "occurrence", "pageLabel"]) }, ["record", "field", "value"]);
const profile = shape({ id: str, name: str, updatedAt: num, componentHint: str, rows: array(row) }, ["id", "name", "updatedAt", "rows"]);
const fingerprint = shape({
  ...strings(["menu", "component", "market", "page", "toolsRel", "uiMode"]),
  tabLabels: array(str), structureLabels: array(str), fieldIds: array(str),
  fieldIdsComplete: (v) => typeof v === "boolean",
  fieldIdsTotal: (v) => Number.isInteger(v) && (v as number) >= 0,
  structureLabelsComplete: (v) => typeof v === "boolean",
  pageMetadataComplete: (v) => typeof v === "boolean",
}, ["menu", "component", "market", "page", "toolsRel", "uiMode", "tabLabels", "structureLabels", "fieldIds"]);
const watch = shape({
  ...strings(["id", "label", "notes", "menu", "component", "market", "envLabel"]),
  capturedAt: timestamp, baseline: fingerprint, scope: (v) => {
    try { const url = new URL(v as string); return typeof v === "string" && /^https?:$/.test(url.protocol) && !url.username && !url.password && !url.search && !url.hash; }
    catch { return false; }
  },
}, ["id", "label", "notes", "menu", "component", "market", "envLabel", "capturedAt", "baseline"]);
const origin: Check = (v) => {
  try { return typeof v === "string" && /^https?:\/\//.test(v) && new URL(v).origin === v; }
  catch { return false; }
};
const traceRequest = shape({ origin,
  site: str, at: timestamp, target: oneOf("on", "off"), status: oneOf("requested", "confirmed", "incomplete", "unknown") });
const defaults = createDefaultSettings();
const checks: Record<keyof MpuSettings, Check> = {
  features: shape(Object.fromEntries(Object.keys(defaults.features).map((k) => [k, yn])), []),
  traceSettings: shape(Object.fromEntries(Object.keys(defaults.traceSettings).map((k) => [k, yn])), []),
  featureUiScopes: shape(Object.fromEntries(Object.keys(defaults.featureUiScopes).map((k) => [k, oneOf("both", "classic", "fluid")])), []),
  favorites: array(favorite),
  recentComponents: array(shape({ ...strings(["Menu", "Component", "Market", "Portal", "Node", "Site"]), Servlet: oneOf("psp", "psc"), visitedAt: num })),
  customizationWatches: array(watch),
  environments: array(shape({ label: str, active: yn, trcProfRunning: yn, color: str, traceRequest,
    classification: oneOf("unclassified", "non-production", "production") }, ["label", "active", "trcProfRunning"])),
  urlSites: (v) => object(v) && Object.entries(v).every(([origin, sites]) =>
    /^https?:\/\//.test(origin) && object(sites) && Object.entries(sites).every(([site, mapping]) =>
      !["__proto__", "constructor", "prototype"].includes(site) &&
      shape({ envId: (id) => num(id) && Number.isInteger(id) })(mapping))),
  hostAllowlist: array(str), quietEnvPrompt: yn, showOnboarding: yn,
  fieldCopyFormat: oneOf("record.field", "ampersand", "getfield", "getrowset"),
  barPlacement: oneOf("aboveContent", "documentTop"), barSticky: yn,
  fieldEntryProfiles: array(profile), schemaVersion: (v) => v === defaults.schemaVersion,
};

/** Reject malformed or foreign JSON before it can overwrite live settings. */
export function isSettingsBackup(value: unknown): value is Partial<MpuSettings> {
  return object(value) && Object.keys(value).length > 0 && shape(checks, [])(value);
}

export function mergeSettingsBackup(base: MpuSettings, patch: Partial<MpuSettings>): MpuSettings {
  return { ...base, ...patch,
    features: { ...base.features, ...patch.features },
    traceSettings: { ...base.traceSettings, ...patch.traceSettings },
    featureUiScopes: { ...base.featureUiScopes, ...patch.featureUiScopes },
  };
}

/** Recover usable stored preferences without trusting old/corrupt collections.
 * Do not write repairs during reads: another tab may be editing settings.
 */
export function normalizeStoredSettings(value: unknown): MpuSettings {
  const result = createDefaultSettings();
  if (!object(value)) {
    // An existing but unreadable settings blob must not enable page helpers.
    result.features.hostAllowlistEnabled = "Yes";
    return result;
  }
  for (const key of Object.keys(checks) as Array<keyof MpuSettings>) {
    if (!Object.hasOwn(value, key)) continue;
    const stored = value[key];
    if (key === "features" || key === "traceSettings" || key === "featureUiScopes") {
      if (object(stored)) {
        for (const name of Object.keys(result[key])) {
          if (Object.hasOwn(stored, name) && checks[key]({ [name]: stored[name] })) {
            Object.assign(result[key], { [name]: stored[name] });
          }
        }
      }
      if (key === "features" && (!object(stored) ||
        (Object.hasOwn(stored, "hostAllowlistEnabled") && !yn(stored.hostAllowlistEnabled)))) {
        result.features.hostAllowlistEnabled = "Yes";
      }
    } else if (key === "environments" && Array.isArray(stored)) {
      // Site mappings use array indices: never shift a valid environment into
      // the position of a broken entry (which could activate the wrong site).
      result.environments = stored.map((entry, index) => checks.environments([entry])
        ? entry as MpuSettings["environments"][number]
        : { label: `Unavailable environment ${index + 1}`, active: "No", trcProfRunning: "No" });
    } else if (key === "urlSites" && object(stored)) {
      for (const [origin, sites] of Object.entries(stored)) {
        if (!object(sites)) continue;
        for (const [site, mapping] of Object.entries(sites)) {
          if (checks.urlSites({ [origin]: { [site]: mapping } })) {
            result.urlSites[origin] ??= {};
            result.urlSites[origin][site] = mapping as { envId: number };
          }
        }
      }
    } else if (Array.isArray(result[key]) && Array.isArray(stored)) {
      Object.assign(result, { [key]: stored.filter((entry) => checks[key]([entry])) });
      if (key === "customizationWatches") result.customizationWatches = normalizeWatchHistory(result.customizationWatches);
    } else if (checks[key](stored)) {
      Object.assign(result, { [key]: stored });
    }
  }
  return result;
}
