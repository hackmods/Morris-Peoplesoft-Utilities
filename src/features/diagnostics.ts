import type { MpuSettings } from "../storage/schema";
import { DEFAULT_FEATURES, DEFAULT_FEATURE_UI_SCOPES } from "../storage/schema";

/** Allowlisted summary only. Never serialize page HTML, field values, URLs,
 * object names, favorites, profiles, notes, tokens or raw errors. */
export function buildDiagnosticReport(settings: MpuSettings, context: {
  version: string; toolsRel?: string; uiMode?: string; traceStatus: "requested" | "last-confirmed" | "unknown";
}): string {
  const version = /^\d+\.\d+\.\d+$/.test(context.version) ? context.version : "unknown";
  const tools = /^\d+\.\d+(?:\.\d+)?$/.test(context.toolsRel || "") ? context.toolsRel : "unknown";
  const ui = ["classic", "fluid", "navCollection", "unknown"].includes(context.uiMode || "") ? context.uiMode : "unknown";
  return JSON.stringify({
    report: "MPU local diagnostics", extensionVersion: version, peopleTools: tools, uiMode: ui,
    traceEvidence: context.traceStatus,
    traceNotice: "Request history only; current server trace state is not verified.",
    enabledFeatures: (Object.keys(DEFAULT_FEATURES) as Array<keyof typeof DEFAULT_FEATURES>).filter((key) => settings.features[key] === "Yes"),
    uiScopes: Object.fromEntries((Object.keys(DEFAULT_FEATURE_UI_SCOPES) as Array<keyof typeof DEFAULT_FEATURE_UI_SCOPES>)
      .map((key) => [key, ["both", "classic", "fluid"].includes(settings.featureUiScopes[key]) ? settings.featureUiScopes[key] : "unknown"])),
    barPlacement: settings.barPlacement, stickyBar: settings.barSticky === "Yes",
    dataIncluded: "Allowlisted configuration summary only. No page/field values, hostnames, user IDs, session tokens, favorites or profile contents.",
    reproductionSteps: "[Add sanitized steps and expected/actual behavior after reviewing this report.]",
    validation: "[Record actual checks; automated fixtures do not establish PeopleTools compatibility or accessibility conformance.]",
  }, null, 2);
}
