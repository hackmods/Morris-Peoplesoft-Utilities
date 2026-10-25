import type { PageFingerprint } from "../storage/schema";
import { compareFingerprints, type DriftFinding } from "./upgrade-watch";
import type { EnvironmentSnapshot, SavedEnvironmentComparison } from "../storage/environment-comparisons";

export type { EnvironmentSnapshot, SavedEnvironmentComparison };

export interface EnvironmentComparisonReport {
  headline: "Observed UI differences" | "No observed UI differences";
  findings: DriftFinding[];
  warnings: string[];
  left: EnvironmentSnapshot;
  right: EnvironmentSnapshot;
}

function validIsoDate(value: number): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "unknown date";
}

function differentIdentity(left: PageFingerprint, right: PageFingerprint): boolean {
  return left.menu !== right.menu || left.component !== right.component || left.market !== right.market;
}

/** Compare only the two snapshots the user selected. Labels never imply a shared system. */
export function compareEnvironmentSnapshots(left: EnvironmentSnapshot, right: EnvironmentSnapshot): EnvironmentComparisonReport {
  if (left.id === right.id) throw new Error("Choose two different environment snapshots.");
  const report = compareFingerprints(left.fingerprint, right.fingerprint);
  const observedCodes = new Set(["page", "uiMode", "tabs", "structure", "fields"]);
  const observed = report.findings.filter((finding) => observedCodes.has(finding.code));
  const warnings = [
    "Browser evidence describes the loaded page only. It cannot establish PeopleCode, SQL, database, or object equivalence.",
    "Environment labels are user supplied. Matching labels alone do not establish that snapshots came from the same environment.",
  ];
  warnings.push("PUM image is not captured or verified by this comparison.");
  if (!left.applicationRelease || !right.applicationRelease) warnings.push("Application release metadata from page information is unknown for at least one snapshot.");
  else if (left.applicationRelease !== right.applicationRelease) warnings.push("Application release metadata from page information differs between snapshots.");
  if (!left.extensionVersion || !right.extensionVersion) warnings.push("Extension version metadata is unknown for at least one snapshot.");
  else if (left.extensionVersion !== right.extensionVersion) warnings.push("Extension versions differ; capture behavior may differ.");
  if ([left, right].some((snapshot) => !snapshot.fingerprint.menu || !snapshot.fingerprint.component || !snapshot.fingerprint.market || !snapshot.fingerprint.page || !snapshot.fingerprint.uiMode || !snapshot.fingerprint.toolsRel)) warnings.push("Object, page, UI mode, or PeopleTools metadata is missing from at least one capture.");
  if (left.origin !== right.origin || left.site !== right.site) warnings.push("Portal origin, port, or site differs between snapshots; review each scope explicitly.");
  if (!left.targetOrigin || !left.targetSite || !right.targetOrigin || !right.targetSite) warnings.push("Loaded target document scope is unknown for at least one snapshot.");
  if (left.targetOrigin !== right.targetOrigin || left.targetSite !== right.targetSite) warnings.push("Loaded target document origin or site differs between snapshots.");
  if ((left.targetOrigin && (left.targetOrigin !== left.origin || left.targetSite !== left.site))
    || (right.targetOrigin && (right.targetOrigin !== right.origin || right.targetSite !== right.site))) warnings.push("A loaded target document scope differs from its portal scope.");
  if (left.environment !== right.environment) warnings.push("Environment labels differ; the snapshots are not treated as the same environment.");
  if (differentIdentity(left.fingerprint, right.fingerprint)) warnings.push("Menu, component, or market metadata differs; this may be a different object.");
  if (left.fingerprint.page !== right.fingerprint.page) warnings.push("Active page metadata differs or is missing.");
  if (left.fingerprint.uiMode !== right.fingerprint.uiMode) warnings.push("UI mode differs or is missing.");
  for (const warning of left.captureWarnings) warnings.push("Left capture: " + warning);
  for (const warning of right.captureWarnings) warnings.push("Right capture: " + warning);
  for (const finding of report.findings) {
    if (finding.code === "capture-completeness") warnings.push(finding.message);
    else if (finding.code === "toolsRel") warnings.push("PeopleTools version metadata differs between snapshots.");
  }
  return {
    headline: observed.length ? "Observed UI differences" : "No observed UI differences",
    findings: report.findings,
    warnings: [...new Set(warnings)],
    left,
    right,
  };
}

function scopeLines(side: string, snapshot: EnvironmentSnapshot): string[] {
  return [
    side + " snapshot: " + snapshot.label,
    "  Environment label: " + snapshot.environment,
    "  Portal scope: " + snapshot.origin + " / " + snapshot.site,
    "  Loaded target scope: " + (snapshot.targetOrigin || "unknown") + " / " + (snapshot.targetSite || "unknown"),
    "  Captured: " + validIsoDate(snapshot.capturedAt),
    "  PeopleTools: " + (snapshot.fingerprint.toolsRel || "unknown"),
    "  Extension version: " + (snapshot.extensionVersion || "unknown"),
    "  Application release (page metadata): " + (snapshot.applicationRelease || "unknown"),
    "  PUM image: unknown (not captured or verified)",
    "  Object/page/UI: " + [snapshot.fingerprint.menu, snapshot.fingerprint.component, snapshot.fingerprint.market, snapshot.fingerprint.page, snapshot.fingerprint.uiMode].map((part) => part || "unknown").join(" / "),
    `  Field IDs: ${snapshot.fingerprint.fieldIds.length} retained of ${snapshot.fingerprint.fieldIdsTotal ?? "unknown"}; cap 200; complete: ${snapshot.fingerprint.fieldIdsComplete ?? "unknown"}`,
    `  Structure hosts: ${snapshot.fingerprint.structureLabels.length} retained; cap 40; complete: ${snapshot.fingerprint.structureLabelsComplete ?? "unknown"}`,
    `  Tab labels: ${snapshot.fingerprint.tabLabels.length} retained; cap 40; unloaded tabs not captured`,
  ];
}

/** Plain-text report for a visible copy/download action; no automatic export occurs. */
export function formatEnvironmentComparison(left: EnvironmentSnapshot, right: EnvironmentSnapshot, label = left.label + " vs " + right.label): string {
  const report = compareEnvironmentSnapshots(left, right);
  return [
    "Environment comparison: " + label,
    "",
    ...scopeLines("Left", left),
    "",
    ...scopeLines("Right", right),
    "",
    "Result: " + report.headline,
    ...report.findings.map((finding) => "• [" + finding.severity + "] " + finding.message),
    "",
    "Warnings and evidence limits:",
    ...report.warnings.map((warning) => "• " + warning),
    "",
    "Comparison is based on bounded browser UI fingerprints from the loaded documents. It does not establish PeopleCode, SQL, database, or complete object equivalence. Verify application release/PUM and server-side evidence separately.",
  ].join("\n");
}
