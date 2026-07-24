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
  /**
   * FE-01..04: Field Entry toolkit (capture / paste / sheet / find-replace).
   * Careful — writes visible editable field values; default Off.
   */
  fieldEntryOption: YesNo;
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
  fieldEntryOption: FeatureUiScope;
}

/** One captured / pasted field value keyed by RECORD.FIELD (FE-01..04). */
export interface FieldEntryRow {
  record: string;
  field: string;
  /** Grid occurrence after `$` when present */
  occurrence?: string;
  value: string;
  pageLabel?: string;
}

/** Named local profile of field values (may contain business keys). */
export interface FieldEntryProfile {
  id: string;
  name: string;
  updatedAt: number;
  /** Optional Menu.Component hint for filtering */
  componentHint?: string;
  rows: FieldEntryRow[];
}

/**
 * Where the utilities bar mounts.
 * - aboveContent: Classic — above `#ptifrmtarget`; Fluid — in header (default)
 * - documentTop: first child of `document.body` (very top of the site)
 */
export type BarPlacement = "aboveContent" | "documentTop";

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

/** UG-01: DOM/UI fingerprint for post-upgrade customization drift checks. */
export interface PageFingerprint {
  menu: string;
  component: string;
  market: string;
  page: string;
  toolsRel: string;
  uiMode: string;
  tabLabels: string[];
  structureLabels: string[];
  fieldIds: string[];
}

/** User-marked customized object with a baseline fingerprint (local only). */
export interface CustomizationWatch {
  id: string;
  label: string;
  notes: string;
  menu: string;
  component: string;
  market: string;
  baseline: PageFingerprint;
  capturedAt: number;
  envLabel: string;
}

export interface MpuSettings {
  features: FeatureFlags;
  favorites: Favorite[];
  /** PI-04: last N components visited in this browser */
  recentComponents: RecentComponent[];
  /**
   * UG-01: customization upgrade watchlist — UI/DOM fingerprints for post-upgrade drift checks.
   * Not a substitute for App Designer Compare Report (PeopleCode).
   */
  customizationWatches: CustomizationWatch[];
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
  /** UX-11: bar mount — above content iframe/header vs very top of the page */
  barPlacement: BarPlacement;
  /** UX-11: keep bar visible while the portal document scrolls */
  barSticky: YesNo;
  /** FE-04: named Field Entry profiles (local only; may hold business keys) */
  fieldEntryProfiles: FieldEntryProfile[];
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
  // Utilities bar essentials — on
  userIdOption: "Yes",
  greetingOption: "Yes",
  shortcutsOption: "Yes",
  pageInfoOption: "Yes",
  newWindowOption: "Yes",
  // Page helpers — on
  recFieldInfoOption: "Yes",
  advSearchOption: "Yes",
  loginPageOption: "Yes",
  // Optional / careful — off
  traceOption: "No",
  correctHistoryOption: "No",
  fieldEntryOption: "No",
  // Compliance — allowlist opt-in off
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
  fieldEntryOption: "both",
};

export function createDefaultSettings(): MpuSettings {
  return {
    features: { ...DEFAULT_FEATURES },
    favorites: [],
    recentComponents: [],
    customizationWatches: [],
    environments: [],
    urlSites: {},
    traceSettings: { ...DEFAULT_TRACE },
    featureUiScopes: { ...DEFAULT_FEATURE_UI_SCOPES },
    hostAllowlist: [],
    quietEnvPrompt: "No",
    showOnboarding: "No",
    fieldCopyFormat: "record.field",
    barPlacement: "aboveContent",
    barSticky: "No",
    fieldEntryProfiles: [],
    schemaVersion: SCHEMA_VERSION,
  };
}

/** Normalize a stored Field Entry profile (drop empty / invalid rows). */
export function normalizeFieldEntryProfile(raw: unknown): FieldEntryProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<FieldEntryProfile>;
  const name = typeof p.name === "string" ? p.name.trim() : "";
  if (!name) return null;
  const id =
    typeof p.id === "string" && p.id.trim()
      ? p.id.trim()
      : `fe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const rows = Array.isArray(p.rows)
    ? p.rows
        .map((r) => normalizeFieldEntryRow(r))
        .filter((r): r is FieldEntryRow => r != null)
    : [];
  return {
    id,
    name,
    updatedAt: typeof p.updatedAt === "number" && Number.isFinite(p.updatedAt) ? p.updatedAt : Date.now(),
    componentHint:
      typeof p.componentHint === "string" && p.componentHint.trim()
        ? p.componentHint.trim()
        : undefined,
    rows,
  };
}

export function normalizeFieldEntryRow(raw: unknown): FieldEntryRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<FieldEntryRow>;
  const record = typeof r.record === "string" ? r.record.trim() : "";
  const field = typeof r.field === "string" ? r.field.trim() : "";
  if (!record || !field) return null;
  const value = typeof r.value === "string" ? r.value : r.value == null ? "" : String(r.value);
  return {
    record,
    field,
    value,
    occurrence:
      typeof r.occurrence === "string" && r.occurrence.trim() ? r.occurrence.trim() : undefined,
    pageLabel: typeof r.pageLabel === "string" && r.pageLabel.trim() ? r.pageLabel.trim() : undefined,
  };
}

export function normalizeFieldEntryProfiles(raw: unknown): FieldEntryProfile[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeFieldEntryProfile).filter((p): p is FieldEntryProfile => p != null);
}

export function normalizeBarPlacement(v: unknown): BarPlacement {
  return v === "documentTop" ? "documentTop" : "aboveContent";
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
