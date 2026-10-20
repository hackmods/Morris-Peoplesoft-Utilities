import { isHtmlElement } from "../adapters/dom";
import type { ParsedPsUrl } from "../adapters/ps-page";
import {
  collectPageMeta,
  collectPageTabs,
  getTargetDocument,
  type PageMeta,
} from "../adapters/ps-page";
import type { CustomizationWatch, PageFingerprint } from "../storage/schema";
import { CUSTOMIZATION_WATCH_LIMIT, normalizeWatchHistory } from "../storage/schema";
import { collectFluidStructure } from "./fluid-structure";

export type { CustomizationWatch, PageFingerprint };

export { CUSTOMIZATION_WATCH_LIMIT, BASELINES_PER_ENVIRONMENT } from "../storage/schema";
export const FIELD_ID_CAP = 200;

export type DriftSeverity = "clean" | "tools-only" | "drifted";

export interface DriftFinding {
  code: string;
  message: string;
  severity: "info" | "warn";
}

export interface DriftReport {
  severity: DriftSeverity;
  findings: DriftFinding[];
  current: PageFingerprint;
  baseline: PageFingerprint;
}

const FIELD_SCAN_SELECTOR = [
  "input[id]:not([type=hidden])",
  "select[id]",
  "textarea[id]",
  "span.PSEDITBOX_DISPONLY[id]",
  "span.PSDROPDOWNLIST_DISPONLY[id]",
  "span.ps_box-value[id]",
  ".ps_box-edit input[id]",
  ".ps_box-control input[id]",
  ".ps_box-select select[id]",
].join(",");

export function fieldBaseId(id: string): string {
  const dollar = id.indexOf("$");
  return dollar >= 0 ? id.slice(0, dollar) : id;
}

function collectFieldIdBasesWithCompleteness(doc: Document, cap: number): { fieldIds: string[]; total: number; complete: boolean } {
  const target = getTargetDocument(doc);
  const set = new Set<string>();
  for (const el of Array.from(target.querySelectorAll(FIELD_SCAN_SELECTOR))) {
    if (!(isHtmlElement(el)) || !el.id) continue;
    const base = fieldBaseId(el.id);
    if (!base || base.length < 3) continue;
    set.add(base);
  }
  const all = [...set].sort((a, b) => a.localeCompare(b));
  return { fieldIds: all.slice(0, Math.max(0, cap)), total: all.length, complete: all.length <= cap };
}

/** Collect field ids up to cap while still counting every unique id in the document. */
export function collectFieldIdBases(doc: Document = document, cap = FIELD_ID_CAP): string[] {
  return collectFieldIdBasesWithCompleteness(doc, cap).fieldIds;
}

export function capturePageFingerprint(
  doc: Document,
  parsed: ParsedPsUrl,
  meta?: PageMeta,
): PageFingerprint {
  const m = meta ?? collectPageMeta(doc);
  const tabs = collectPageTabs(doc).map((t) => t.label);
  const structureNodes = collectFluidStructure(doc, 41);
  const structureLabelsComplete = structureNodes.length <= 40;
  const structureLabels = structureNodes.slice(0, 40).map((n) => `${n.kind}:${n.label}`);
  const fields = collectFieldIdBasesWithCompleteness(doc, FIELD_ID_CAP);
  return {
    menu: (m.menu ?? parsed.menu ?? "").trim(),
    component: (m.component ?? parsed.component ?? "").trim(),
    market: (parsed.market || "GBL").trim(),
    page: (m.page ?? "").trim(),
    toolsRel: (m.toolsRel ?? "").trim(),
    uiMode: (m.uiMode ?? "").trim(),
    tabLabels: [...new Set(tabs)].sort((a, b) => a.localeCompare(b)),
    structureLabels: [...new Set(structureLabels)].sort((a, b) => a.localeCompare(b)),
    fieldIds: fields.fieldIds,
    fieldIdsComplete: fields.complete,
    fieldIdsTotal: fields.total,
    structureLabelsComplete,
    pageMetadataComplete: Boolean(m.menu && m.component && m.page),
  };
}

export function watchKey(menu: string, component: string, market: string): string {
  return `${menu}.${component}.${market || "GBL"}`.toUpperCase();
}

function setDiff(before: string[], after: string[]): { added: string[]; removed: string[] } {
  const b = new Set(before);
  const a = new Set(after);
  return {
    added: after.filter((x) => !b.has(x)),
    removed: before.filter((x) => !a.has(x)),
  };
}

export function compareFingerprints(baseline: PageFingerprint, current: PageFingerprint): DriftReport {
  const findings: DriftFinding[] = [];

  const objectChanges = [
    baseline.menu && current.menu && baseline.menu !== current.menu ? "menu" : "",
    baseline.component && current.component && baseline.component !== current.component ? "component" : "",
    baseline.market && current.market && baseline.market !== current.market ? "market" : "",
  ].filter(Boolean);
  if (objectChanges.length) findings.push({
    code: "object",
    message: `Object identity changed: ${objectChanges.join(", ")}.`,
    severity: "warn",
  });

  if (baseline.toolsRel && current.toolsRel && baseline.toolsRel !== current.toolsRel) {
    findings.push({
      code: "toolsRel",
      message: `ToolsRel ${baseline.toolsRel} → ${current.toolsRel}`,
      severity: "info",
    });
  }
  if (baseline.page && current.page && baseline.page !== current.page) {
    findings.push({
      code: "page",
      message: `Active page ${baseline.page} → ${current.page}`,
      severity: "warn",
    });
  }
  if (baseline.uiMode && current.uiMode && baseline.uiMode !== current.uiMode) {
    findings.push({
      code: "uiMode",
      message: `UI mode ${baseline.uiMode} → ${current.uiMode}`,
      severity: "warn",
    });
  }

  const completenessWarnings: string[] = [];
  if (baseline.fieldIdsComplete !== true || baseline.fieldIdsTotal === undefined) completenessWarnings.push(`baseline field scan is legacy or incomplete (${baseline.fieldIds.length} retained of ${baseline.fieldIdsTotal ?? "unknown"}; ${FIELD_ID_CAP} retained maximum)`);
  if (current.fieldIdsComplete !== true || current.fieldIdsTotal === undefined) completenessWarnings.push(`current field scan is incomplete (${current.fieldIds.length} retained of ${current.fieldIdsTotal ?? "unknown"}; ${FIELD_ID_CAP} retained maximum)`);
  if (baseline.fieldIdsTotal === 0 || current.fieldIdsTotal === 0) completenessWarnings.push("one capture found no field ids");
  if (baseline.structureLabelsComplete !== true) completenessWarnings.push(`baseline structure scan is legacy or capped (${baseline.structureLabels.length} retained; total unknown; 40 retained maximum)`);
  if (current.structureLabelsComplete !== true) completenessWarnings.push(`current structure scan is capped (${current.structureLabels.length} retained; total unknown; 40 retained maximum)`);
  if (baseline.pageMetadataComplete !== true) completenessWarnings.push("baseline page metadata is legacy or incomplete");
  if (current.pageMetadataComplete !== true) completenessWarnings.push("current page metadata is incomplete");
  if (completenessWarnings.length) findings.push({
    code: "capture-completeness",
    message: `Capture limits: ${completenessWarnings.join("; ")}. A clean result cannot be established.`,
    severity: "warn",
  });

  const tabs = setDiff(baseline.tabLabels, current.tabLabels);
  if (tabs.added.length || tabs.removed.length) {
    findings.push({
      code: "tabs",
      message: `Tabs +${tabs.added.length}/−${tabs.removed.length}${
        tabs.removed.length ? ` (removed: ${tabs.removed.slice(0, 5).join(", ")})` : ""
      }${tabs.added.length ? ` (added: ${tabs.added.slice(0, 5).join(", ")})` : ""}`,
      severity: "warn",
    });
  }

  const structure = setDiff(baseline.structureLabels, current.structureLabels);
  if (structure.added.length || structure.removed.length) {
    findings.push({
      code: "structure",
      message: `Structure hosts +${structure.added.length}/−${structure.removed.length}`,
      severity: "warn",
    });
  }

  const fields = setDiff(baseline.fieldIds, current.fieldIds);
  if (fields.added.length || fields.removed.length) {
    findings.push({
      code: "fields",
      message: `Field ids +${fields.added.length}/−${fields.removed.length}${
        fields.removed.length
          ? ` (removed sample: ${fields.removed.slice(0, 8).join(", ")})`
          : ""
      }${
        fields.added.length ? ` (added sample: ${fields.added.slice(0, 8).join(", ")})` : ""
      }`,
      severity: "warn",
    });
  }

  const hasWarn = findings.some((f) => f.severity === "warn");
  const onlyTools =
    !hasWarn && findings.length > 0 && findings.every((f) => f.code === "toolsRel" || f.code === "uiMode");

  let severity: DriftSeverity = "clean";
  if (hasWarn) severity = "drifted";
  else if (onlyTools || findings.length) severity = "tools-only";

  return { severity, findings, current, baseline };
}

export function formatDriftReportPlain(watch: CustomizationWatch, report: DriftReport): string {
  const header = [
    `Customization watch: ${watch.label}`,
    `Object: ${watch.menu}.${watch.component}.${watch.market}`,
    `Captured: ${new Date(watch.capturedAt).toISOString()} (${watch.envLabel || "—"})`,
    `Result: ${report.severity}`,
    "",
    "Note: MPU compares UI/DOM fingerprints only. PeopleCode-only overrides need App Designer Compare Report / Change Assistant.",
    "",
  ];
  if (!report.findings.length) {
    return [...header, "No differences detected in the captured UI fingerprint; this does not establish full object equivalence."].join("\n");
  }
  return [...header, ...report.findings.map((f) => `• [${f.severity}] ${f.message}`)].join("\n");
}

export function createWatchFromFingerprint(input: {
  fingerprint: PageFingerprint;
  label?: string;
  notes?: string;
  envLabel?: string;
  scope?: string;
  now?: number;
}): CustomizationWatch {
  const fp = input.fingerprint;
  const id = `${watchKey(fp.menu, fp.component, fp.market)}-${input.now ?? Date.now()}-${crypto.randomUUID()}`;
  return {
    id,
    label:
      input.label?.trim() ||
      `${fp.menu}.${fp.component}${fp.page ? ` / ${fp.page}` : ""}`,
    notes: input.notes?.trim() || "",
    menu: fp.menu,
    component: fp.component,
    market: fp.market || "GBL",
    baseline: fp,
    capturedAt: input.now ?? Date.now(),
    envLabel: input.envLabel?.trim() || "",
    ...(input.scope ? { scope: input.scope } : {}),
  };
}

export function upsertWatch(
  list: CustomizationWatch[],
  watch: CustomizationWatch,
  limit = CUSTOMIZATION_WATCH_LIMIT,
): CustomizationWatch[] {
  return normalizeWatchHistory([watch, ...list.filter((w) => w.id !== watch.id)], limit);
}

export function watchScope(parsed: ParsedPsUrl): string {
  try { return `${new URL(parsed.baseURL).origin}/${parsed.siteNormalized}`; }
  catch { return ""; }
}

export function listWatchesForParsed(list: CustomizationWatch[], parsed: ParsedPsUrl): CustomizationWatch[] {
  const key = watchKey(parsed.menu || "", parsed.component || "", parsed.market || "GBL");
  return list.filter((w) => watchKey(w.menu, w.component, w.market) === key).sort((a, b) => b.capturedAt - a.capturedAt);
}

export function findWatchForParsed(
  list: CustomizationWatch[],
  parsed: ParsedPsUrl,
  envLabel?: string,
): CustomizationWatch | undefined {
  if (!parsed.menu || !parsed.component) return undefined;
  const matches = listWatchesForParsed(list, parsed);
  return matches.find((w) => w.scope && w.scope === watchScope(parsed))
    ?? matches.find((w) => !w.scope && (envLabel === undefined || w.envLabel === envLabel));
}

/** A reviewable document only; this does not create or run a CA project. */
export function formatDriftHandoffMarkdown(watch: CustomizationWatch, report: DriftReport, targetEnv = "unspecified"): string {
  const text = (value: string) => value.replace(/[\r\n]/g, " ").replace(/[\\`*_{}[\]<>#|]/g, "\\$&");
  return [
    "# Upgrade validation handoff", "",
    `Object: ${text(`${watch.menu}.${watch.component}.${watch.market}`)}`,
    `Baseline: ${text(watch.envLabel || "unspecified")} — ${new Date(watch.capturedAt).toISOString()}`,
    `Target: ${text(targetEnv)}`,
    `PeopleTools: ${text(watch.baseline.toolsRel || "unknown")} → ${text(report.current.toolsRel || "unknown")}`,
    `UI comparison: ${report.severity}`, "",
    "## Observed UI differences", "",
    ...(report.findings.length ? report.findings.map((finding) => `- ${text(finding.message)}`) : ["- No differences detected in the captured UI fingerprint; this does not establish full object equivalence."]), "",
    "## Reviewer completion", "",
    "- Application release / PUM and patch: [confirm]",
    "- App Designer Compare Report / Change Assistant project: [attach verified evidence]",
    "- Dependencies, configuration migration and manual steps: [review]",
    "- Regression / accessibility tests and actual outcomes: [record]",
    "- Rollback plan, owner and approval: [complete]", "",
    "MPU compared browser UI fingerprints only. This does not establish PeopleCode equivalence, certify an upgrade, or authorize deployment.",
  ].join("\n");
}
