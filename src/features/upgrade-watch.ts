import type { ParsedPsUrl } from "../adapters/ps-page";
import {
  collectPageMeta,
  collectPageTabs,
  getTargetDocument,
  type PageMeta,
} from "../adapters/ps-page";
import type { CustomizationWatch, PageFingerprint } from "../storage/schema";
import { collectFluidStructure } from "./fluid-structure";

export type { CustomizationWatch, PageFingerprint };

export const CUSTOMIZATION_WATCH_LIMIT = 50;
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

/** Collect delivered/custom field host ids visible in the target document. */
export function collectFieldIdBases(doc: Document = document, cap = FIELD_ID_CAP): string[] {
  const target = getTargetDocument(doc);
  const set = new Set<string>();
  for (const el of Array.from(target.querySelectorAll(FIELD_SCAN_SELECTOR))) {
    if (!(el instanceof HTMLElement) || !el.id) continue;
    const base = fieldBaseId(el.id);
    if (!base || base.length < 3) continue;
    set.add(base);
    if (set.size >= cap) break;
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function capturePageFingerprint(
  doc: Document,
  parsed: ParsedPsUrl,
  meta?: PageMeta,
): PageFingerprint {
  const m = meta ?? collectPageMeta(doc);
  const tabs = collectPageTabs(doc).map((t) => t.label);
  const structureLabels = collectFluidStructure(doc, 40).map((n) => `${n.kind}:${n.label}`);
  return {
    menu: (m.menu ?? parsed.menu ?? "").trim(),
    component: (m.component ?? parsed.component ?? "").trim(),
    market: (parsed.market || "GBL").trim(),
    page: (m.page ?? "").trim(),
    toolsRel: (m.toolsRel ?? "").trim(),
    uiMode: (m.uiMode ?? "").trim(),
    tabLabels: [...new Set(tabs)].sort((a, b) => a.localeCompare(b)),
    structureLabels: [...new Set(structureLabels)].sort((a, b) => a.localeCompare(b)),
    fieldIds: collectFieldIdBases(doc),
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
      severity: "info",
    });
  }

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
    return [...header, "No UI/object differences detected versus baseline."].join("\n");
  }
  return [...header, ...report.findings.map((f) => `• [${f.severity}] ${f.message}`)].join("\n");
}

export function createWatchFromFingerprint(input: {
  fingerprint: PageFingerprint;
  label?: string;
  notes?: string;
  envLabel?: string;
  now?: number;
}): CustomizationWatch {
  const fp = input.fingerprint;
  const id = `${watchKey(fp.menu, fp.component, fp.market)}-${input.now ?? Date.now()}`;
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
  };
}

export function upsertWatch(
  list: CustomizationWatch[],
  watch: CustomizationWatch,
  limit = CUSTOMIZATION_WATCH_LIMIT,
): CustomizationWatch[] {
  const key = watchKey(watch.menu, watch.component, watch.market);
  const rest = list.filter((w) => watchKey(w.menu, w.component, w.market) !== key);
  return [watch, ...rest].slice(0, limit);
}

export function findWatchForParsed(
  list: CustomizationWatch[],
  parsed: ParsedPsUrl,
): CustomizationWatch | undefined {
  if (!parsed.menu || !parsed.component) return undefined;
  const key = watchKey(parsed.menu, parsed.component, parsed.market || "GBL");
  return list.find((w) => watchKey(w.menu, w.component, w.market) === key);
}
