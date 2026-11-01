import type { FeatureFlags } from "./schema";

/** Feature flags exposed as Options / popup toggles (not host allowlist). */
export type FeatureToggleKey = Exclude<keyof FeatureFlags, "hostAllowlistEnabled">;

export interface FeatureToggleDef {
  key: FeatureToggleKey;
  label: string;
  /** Short Options hint under the toggle */
  hint?: string;
}

export interface FeatureToggleGroup {
  id: string;
  title: string;
  description: string;
  /** Visual tone for the group card */
  tone: "essential" | "helper" | "careful";
  collapsed?: boolean;
  items: FeatureToggleDef[];
}

/**
 * Grouped feature toggles for Options QOL layout.
 * Defaults: essential + helper groups On; careful group Off (see DEFAULT_FEATURES).
 */
export const FEATURE_TOGGLE_GROUPS: FeatureToggleGroup[] = [
  {
    id: "navigation",
    title: "Find and navigate",
    description: "Keep your environment context clear and find the components you use.",
    tone: "essential",
    items: [
      {
        key: "greetingOption",
        label: "Show environment status",
        hint: "Keep the environment name and production warning visible",
      },
      {
        key: "shortcutsOption",
        label: "Include saved shortcuts in Find page",
        hint: "Recent pages and direct component entry remain available",
      },
      {
        key: "userIdOption",
        label: "Show User ID in environment details",
        hint: "When PeopleSoft exposes it in page metadata",
      },
      {
        key: "newWindowOption",
        label: "Allow opening destinations in a new window",
        hint: "Adds open-in-new-window choices to Find page",
      },
    ],
  },
  {
    id: "field-finding",
    title: "Inspect and copy",
    description: "Find field names on the current page and prepare values for PeopleCode.",
    tone: "helper",
    items: [
      {
        key: "recFieldInfoOption",
        label: "Find field names",
        hint: "Search visible page fields and copy RECORD.FIELD; the search is page-local",
      },
      {
        key: "advSearchOption",
        label: "Auto-expand Advanced Search",
        hint: "Opens advanced criteria when the page supports it",
      },
    ],
  },
  {
    id: "support",
    title: "Diagnose and support",
    description: "Page context and support tools are grouped under More on the PeopleSoft page.",
    tone: "helper",
    items: [
      {
        key: "pageInfoOption",
        label: "Enable page and support tools",
        hint: "Adds Page Info, Structure, Admin jumps, PCode starters, and upgrade watch to More",
      },
    ],
  },
  {
    id: "advanced",
    title: "Advanced tools",
    description: "Off by default. Turn these on only when your work requires them.",
    tone: "careful",
    collapsed: true,
    items: [
      {
        key: "traceOption",
        label: "Tracing",
        hint: "Needs UTILITIES PeopleCode / SQL Trace security",
      },
      {
        key: "correctHistoryOption",
        label: "Auto-select Correct History",
        hint: "Changes search Action automatically — enable only if intentional",
      },
      {
        key: "fieldEntryOption",
        label: "Field Entry toolkit",
        hint: "Capture / paste / multi-row sheet / find-replace for editable fields (Fluid + modals) — preview first; profiles may hold business keys",
      },
      {
        key: "loginPageOption",
        label: "Show the utilities bar on login pages",
        hint: "The bar does not read or store passwords",
      },
    ],
  },
];

/** Flat list for popup quick toggles and save loops. */
export const FEATURE_LABELS: Array<{ key: FeatureToggleKey; label: string }> =
  FEATURE_TOGGLE_GROUPS.flatMap((g) => g.items.map(({ key, label }) => ({ key, label })));
