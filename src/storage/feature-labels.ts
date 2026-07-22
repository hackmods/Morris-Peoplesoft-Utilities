import type { FeatureFlags } from "./schema";

/** Shared feature toggle labels for popup and options. */
export const FEATURE_LABELS: Array<{ key: keyof FeatureFlags; label: string }> = [
  { key: "userIdOption", label: "Show User ID" },
  { key: "greetingOption", label: "Environment indicator" },
  { key: "shortcutsOption", label: "Shortcuts" },
  { key: "traceOption", label: "Tracing" },
  { key: "pageInfoOption", label: "Page Information" },
  { key: "recFieldInfoOption", label: "Field Inspector" },
  { key: "newWindowOption", label: "New Window" },
  { key: "advSearchOption", label: "Auto-expand Advanced Search" },
  { key: "correctHistoryOption", label: "Auto-select Correct History" },
  { key: "loginPageOption", label: "Show bar on login page" },
];
