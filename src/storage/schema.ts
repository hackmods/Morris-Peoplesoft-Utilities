/** Shared types and storage schema for Morris PeopleSoft Utilities */

export type YesNo = "Yes" | "No";

export interface FeatureFlags {
  userIdOption: YesNo;
  greetingOption: YesNo;
  shortcutsOption: YesNo;
  traceOption: YesNo;
  pageInfoOption: YesNo;
  recFieldInfoOption: YesNo;
  newWindowOption: YesNo;
  correctHistoryOption: YesNo;
  advSearchOption: YesNo;
  loginPageOption: YesNo;
  /** Phase 2: when Yes, restrict to hostAllowlist origins */
  hostAllowlistEnabled: YesNo;
}

export interface Favorite {
  Servlet: "psp" | "psc";
  Menu: string;
  Component: string;
  Market: string;
  Parameters: string;
  Category: string;
  SubCategory: string;
  Description: string;
  /** Optional local note (UX-04) — may contain business context */
  Notes?: string;
  pinned?: boolean;
}

/** Where a feature runs: Classic portal, Fluid, or both (UX-09). */
export type FeatureUiScope = "both" | "classic" | "fluid";

export interface FeatureUiScopes {
  recFieldInfoOption: FeatureUiScope;
  advSearchOption: FeatureUiScope;
  correctHistoryOption: FeatureUiScope;
}

/** Recently visited components (PI-04) — local only, capped. */
export interface RecentComponent {
  Servlet: "psp" | "psc";
  Menu: string;
  Component: string;
  Market: string;
  Portal: string;
  Node: string;
  Site: string;
  visitedAt: number;
}

export const RECENT_COMPONENT_LIMIT = 12;

export function recentComponentKey(r: {
  Menu: string;
  Component: string;
  Market: string;
  Site?: string;
}): string {
  return `${r.Menu}.${r.Component}.${r.Market || "GBL"}@${r.Site || ""}`;
}

/** Prepend a visit, de-dupe by Menu.Component.Market@Site, cap list. */
export function pushRecentComponent(
  list: RecentComponent[],
  entry: RecentComponent,
  limit = RECENT_COMPONENT_LIMIT,
): RecentComponent[] {
  const key = recentComponentKey(entry);
  const rest = list.filter((r) => recentComponentKey(r) !== key);
  return [entry, ...rest].slice(0, limit);
}

export interface Environment {
  label: string;
  active: YesNo;
  trcProfRunning: YesNo;
  /** Optional AA-safe accent (hex). Empty = default */
  color?: string;
}

export interface UrlSiteMap {
  [baseURL: string]: {
    [site: string]: { envId: number };
  };
}

export interface TraceSettings {
  PC0001: YesNo;
  PC0002: YesNo;
  PC0004: YesNo;
  PC0008: YesNo;
  PC0016: YesNo;
  PC0064: YesNo;
  PC0128: YesNo;
  PC0256: YesNo;
  PC0512: YesNo;
  PC1024: YesNo;
  PC2048: YesNo;
  SQL0001: YesNo;
  SQL0002: YesNo;
  SQL0004: YesNo;
  SQL0008: YesNo;
  SQL0016: YesNo;
  SQL0032: YesNo;
  SQL0064: YesNo;
  SQL4096: YesNo;
}

export interface MpuSettings {
  features: FeatureFlags;
  favorites: Favorite[];
  /** PI-04: last N components visited in this browser */
  recentComponents: RecentComponent[];
  environments: Environment[];
  urlSites: UrlSiteMap;
  traceSettings: TraceSettings;
  /** UX-09: Classic vs Fluid enablement for noisy features */
  featureUiScopes: FeatureUiScopes;
  /** Phase 2 origins e.g. https://hr.example.edu */
  hostAllowlist: string[];
  quietEnvPrompt: YesNo;
  /**
   * SP-02: when Yes, Options shows first-run checklist.
   * Existing installs default No via load merge; first install sets Yes in service worker.
   */
  showOnboarding: YesNo;
  /** SP-07: preferred locked-field copy format */
  fieldCopyFormat: FieldCopyFormat;
  schemaVersion: number;
}

/** PeopleCode / clipboard formats for locked Field Inspector copy (SP-07). */
export type FieldCopyFormat = "record.field" | "ampersand" | "getfield" | "getrowset";

export const FIELD_COPY_FORMATS: Array<{ id: FieldCopyFormat; label: string; example: string }> = [
  { id: "record.field", label: "RECORD.FIELD", example: "JOB.EMPLID" },
  { id: "ampersand", label: "&Record.FIELD", example: "&Job.EMPLID" },
  { id: "getfield", label: "GetField(Field.FIELD)", example: "GetField(Field.EMPLID)" },
  {
    id: "getrowset",
    label: "GetRowset…GetField",
    example: "GetLevel0().GetRow(1).GetRecord(Record.JOB).GetField(Field.EMPLID)",
  },
];

export const SCHEMA_VERSION = 1;

export const DEFAULT_FEATURES: FeatureFlags = {
  userIdOption: "Yes",
  greetingOption: "Yes",
  shortcutsOption: "Yes",
  traceOption: "No",
  pageInfoOption: "Yes",
  recFieldInfoOption: "Yes",
  newWindowOption: "Yes",
  correctHistoryOption: "No",
  advSearchOption: "Yes",
  loginPageOption: "Yes",
  hostAllowlistEnabled: "No",
};

export const DEFAULT_TRACE: TraceSettings = {
  PC0001: "No",
  PC0002: "No",
  PC0004: "Yes",
  PC0008: "No",
  PC0016: "No",
  PC0064: "Yes",
  PC0128: "No",
  PC0256: "No",
  PC0512: "No",
  PC1024: "No",
  PC2048: "No",
  SQL0001: "Yes",
  SQL0002: "Yes",
  SQL0004: "No",
  SQL0008: "No",
  SQL0016: "No",
  SQL0032: "No",
  SQL0064: "No",
  SQL4096: "No",
};

export const DEFAULT_FEATURE_UI_SCOPES: FeatureUiScopes = {
  recFieldInfoOption: "both",
  advSearchOption: "both",
  correctHistoryOption: "both",
};

export function createDefaultSettings(): MpuSettings {
  return {
    features: { ...DEFAULT_FEATURES },
    favorites: [],
    recentComponents: [],
    environments: [],
    urlSites: {},
    traceSettings: { ...DEFAULT_TRACE },
    featureUiScopes: { ...DEFAULT_FEATURE_UI_SCOPES },
    hostAllowlist: [],
    quietEnvPrompt: "No",
    showOnboarding: "No",
    fieldCopyFormat: "record.field",
    schemaVersion: SCHEMA_VERSION,
  };
}

export function isYes(v: YesNo | undefined): boolean {
  return v === "Yes";
}

/** Whether a feature should run for the detected UI model. */
export function featureAllowedForUi(
  scope: FeatureUiScope | undefined,
  uiMode: "classic" | "fluid" | "navCollection" | "unknown",
): boolean {
  const s = scope || "both";
  if (s === "both") return true;
  if (uiMode === "navCollection" || uiMode === "unknown") {
    // Nav collections are Classic-like content hosts; treat as classic unless Fluid-only
    return s === "classic";
  }
  return s === uiMode;
}
