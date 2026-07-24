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
  items: FeatureToggleDef[];
}

/**
 * Grouped feature toggles for Options QOL layout.
 * Defaults: essential + helper groups On; careful group Off (see DEFAULT_FEATURES).
 */
export const FEATURE_TOGGLE_GROUPS: FeatureToggleGroup[] = [
  {
    id: "bar",
    title: "Utilities bar",
    description: "Orientation and navigation on every PeopleSoft page. Recommended on.",
    tone: "essential",
    items: [
      {
        key: "greetingOption",
        label: "Environment indicator",
        hint: "Colored env label so you always know DEV / QA / PRD",
      },
      {
        key: "userIdOption",
        label: "Show User ID",
        hint: "When PeopleSoft exposes it in page meta",
      },
      {
        key: "shortcutsOption",
        label: "Shortcuts",
        hint: "Favorites flyout (Category ? SubCategory ? items)",
      },
      {
        key: "pageInfoOption",
        label: "Page Information",
        hint: "Also enables PCode, Structure, Admin, and Upgrade watch",
      },
      {
        key: "newWindowOption",
        label: "New Window actions",
        hint: "Open Shortcuts / Admin / Recent in a new window",
      },
    ],
  },
  {
    id: "helpers",
    title: "Page helpers",
    description: "Day-to-day productivity for BAs and developers.",
    tone: "helper",
    items: [
      {
        key: "recFieldInfoOption",
        label: "Field Inspector",
        hint: "Orange icons beside fields ? lock copies RECORD.FIELD",
      },
      {
        key: "advSearchOption",
        label: "Auto-expand Advanced Search",
        hint: "Opens advanced criteria when the page supports it",
      },
      {
        key: "loginPageOption",
        label: "Show bar on login page",
        hint: "Bar only ? never reads or stores passwords",
      },
    ],
  },
  {
    id: "careful",
    title: "Optional / careful",
    description: "Off by default ? turn on only when you need them.",
    tone: "careful",
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
        hint: "Capture / paste / sheet / find-replace for editable fields — preview first; may hold business keys in profiles",
      },
    ],
  },
];

/** Flat list for popup quick toggles and save loops. */
export const FEATURE_LABELS: Array<{ key: FeatureToggleKey; label: string }> =
  FEATURE_TOGGLE_GROUPS.flatMap((g) => g.items.map(({ key, label }) => ({ key, label })));
