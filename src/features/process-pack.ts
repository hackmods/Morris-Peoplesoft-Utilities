import { getTargetDocument } from "../adapters/ps-page";
import type { ParsedPsUrl } from "../adapters/ps-page";

export interface ProcessPack {
  processInstance?: string;
  processType?: string;
  processName?: string;
  runControl?: string;
  user?: string;
  runStatus?: string;
}

const PROCESS_MONITOR_COMPONENTS = new Set(["PMN_PRCSLIST", "PRCSMONITOR", "PROCESSMONITOR"]);

const FIELD_HINTS: Array<{ key: keyof ProcessPack; parts: string[] }> = [
  { key: "processInstance", parts: ["PRCSINSTANCE", "PROCESSINSTANCE", "PRCS_INST"] },
  { key: "processType", parts: ["PRCSTYPE", "PROCESSTYPE", "PRCS_TYPE"] },
  { key: "processName", parts: ["PRCSNAME", "PROCESSNAME", "PRCS_NAME"] },
  { key: "runControl", parts: ["RUNCONTROL", "RUN_CNTL", "RUNCNTL"] },
  { key: "user", parts: ["OPRID", "RUNOPRID", "USERID", "REQUESTOR"] },
  { key: "runStatus", parts: ["RUNSTATUS", "PRCSSTATUS", "STATUS"] },
];

function cleanValue(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 120);
}

function readFieldValue(doc: Document, idPart: string): string | undefined {
  const el = doc.querySelector(
    `input[id*="${idPart}" i], span[id*="${idPart}" i], select[id*="${idPart}" i], a[id*="${idPart}" i]`,
  );
  if (!el) return undefined;
  const v =
    (el as HTMLInputElement).value ??
    el.textContent ??
    el.getAttribute("title") ??
    el.getAttribute("aria-label");
  const cleaned = cleanValue(v || "");
  return cleaned || undefined;
}

function readLabelPair(doc: Document, labelRe: RegExp): string | undefined {
  for (const el of Array.from(doc.querySelectorAll("label, span, th, .PSEDITBOXLABEL, .ps_box-label"))) {
    const text = el.textContent?.replace(/\s+/g, " ").trim() || "";
    if (!labelRe.test(text)) continue;
    const sibling =
      el.nextElementSibling?.textContent ||
      el.parentElement?.querySelector(
        "input, select, span.PSEDITBOX_DISPONLY, .ps_box-value, a",
      )?.textContent;
    const val = cleanValue(sibling || "");
    if (val) return val;
  }
  return undefined;
}

export function isProcessMonitorPage(doc: Document = document, parsed?: ParsedPsUrl): boolean {
  const component = parsed?.component || "";
  if (PROCESS_MONITOR_COMPONENTS.has(component.toUpperCase())) return true;
  const target = getTargetDocument(doc);
  return !!target.querySelector(
    '[id*="PRCSINSTANCE" i], [id*="PRCSMON" i], [id*="PROCESSINSTANCE" i]',
  );
}

/** AD-03: scrape visible Process Monitor cells for ticket handoff. */
export function collectProcessPack(doc: Document = document, parsed?: ParsedPsUrl): ProcessPack | null {
  if (!isProcessMonitorPage(doc, parsed)) return null;

  const target = getTargetDocument(doc);
  const pack: ProcessPack = {};

  for (const { key, parts } of FIELD_HINTS) {
    for (const part of parts) {
      const v = readFieldValue(target, part);
      if (v) {
        pack[key] = v;
        break;
      }
    }
  }

  pack.processInstance =
    pack.processInstance || readLabelPair(target, /process\s+instance/i);
  pack.processType = pack.processType || readLabelPair(target, /process\s+type/i);
  pack.processName = pack.processName || readLabelPair(target, /process\s+name/i);
  pack.runControl = pack.runControl || readLabelPair(target, /run\s+control/i);
  pack.user = pack.user || readLabelPair(target, /(?:run\s+)?user|requestor|operator/i);
  pack.runStatus = pack.runStatus || readLabelPair(target, /run\s+status|status/i);

  const hasAny = Object.values(pack).some(Boolean);
  return hasAny ? pack : null;
}

export function formatProcessPackPlain(pack: ProcessPack): string {
  const lines: string[] = [];
  if (pack.processInstance) lines.push(`Process Instance: ${pack.processInstance}`);
  if (pack.processType) lines.push(`Process Type: ${pack.processType}`);
  if (pack.processName) lines.push(`Process Name: ${pack.processName}`);
  if (pack.runControl) lines.push(`Run Control: ${pack.runControl}`);
  if (pack.user) lines.push(`User: ${pack.user}`);
  if (pack.runStatus) lines.push(`Run Status: ${pack.runStatus}`);
  return lines.join("\n");
}
