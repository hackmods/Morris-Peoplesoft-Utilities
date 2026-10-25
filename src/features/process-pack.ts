import { getTargetDocument } from "../adapters/ps-page";
import { isInput, isSelect, isVisible } from "../adapters/dom";
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
  { key: "runStatus", parts: ["RUNSTATUS", "PRCSSTATUS"] },
];

const FIELD_SELECTOR = "input[id], span[id], select[id], a[id]";
const LABEL_SELECTOR = "label, span, th, .PSEDITBOXLABEL, .ps_box-label";
const ROW_SELECTOR = 'tr, [role="row"]';

/** Content-script UI is hosted in the page document, but is never process evidence. */
function isEvidence(el: Element): boolean {
  return isVisible(el) && !el.closest('[id^="mpu-"], .mpu-flyout, .mpu-dialog') &&
    !(isInput(el) && (el.type === "hidden" || el.type === "password"));
}

function cleanValue(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 120);
}

function elementValue(el: Element): string | undefined {
  if (!isEvidence(el)) return undefined;
  const visibleText = (node: Node): string => {
    if (node.nodeType === 3) return node.textContent || "";
    if (node.nodeType === 1 && !isEvidence(node as Element)) return "";
    return Array.from(node.childNodes).map(visibleText).join(" ");
  };
  const raw = isInput(el) || isSelect(el)
    ? el.value
    : visibleText(el) || el.getAttribute("title") || el.getAttribute("aria-label") || "";
  return cleanValue(raw) || undefined;
}

function readFieldValue(root: Document | Element, idPart: string): string | undefined {
  for (const el of root.querySelectorAll(FIELD_SELECTOR)) {
    if (!el.id.toUpperCase().includes(idPart)) continue;
    const value = elementValue(el);
    if (value) return value;
  }
  return undefined;
}

function labelValue(el: Element, root: Document | Element): string | undefined {
  // A value beside the label is evidence; the label's own text is not.
  const sibling = el.nextElementSibling;
  if (sibling) {
    const value = elementValue(sibling) ||
      Array.from(sibling.querySelectorAll("input, select, span, a, .ps_box-value"))
        .map(elementValue).find(Boolean);
    if (value) return value;
  }
  const control = el.getAttribute("for") && el.ownerDocument.getElementById(el.getAttribute("for")!);
  return control && root.contains(control) ? elementValue(control) : undefined;
}

function readLabelPair(root: Document | Element, labelRe: RegExp): string | undefined {
  for (const el of root.querySelectorAll(LABEL_SELECTOR)) {
    if (!isEvidence(el)) continue;
    const text = cleanValue(el.textContent || "");
    if (!labelRe.test(text)) continue;
    const value = labelValue(el, root);
    if (value) return value;
  }
  return undefined;
}

function instanceValues(root: Document | Element): Array<{ el: Element; value: string }> {
  const values: Array<{ el: Element; value: string }> = [];
  for (const el of root.querySelectorAll(FIELD_SELECTOR)) {
    if (!FIELD_HINTS[0]!.parts.some((part) => el.id.toUpperCase().includes(part))) continue;
    const value = elementValue(el);
    if (value) values.push({ el, value });
  }
  return values;
}

function instanceMarkers(root: Document | Element): Array<{ el: Element; value: string }> {
  const byId = instanceValues(root);
  for (const el of root.querySelectorAll(LABEL_SELECTOR)) {
    if (!isEvidence(el) || !/process\s+instance/i.test(cleanValue(el.textContent || ""))) continue;
    const value = labelValue(el, root);
    if (!value) continue;
    const controlId = el.getAttribute("for");
    const sameControl = byId.some(({ el: field, value: fieldValue }) => fieldValue === value &&
      (controlId === field.id || el.nextElementSibling === field || !!el.nextElementSibling?.contains(field)));
    if (!sameControl) byId.push({ el, value });
  }
  return byId;
}

function fieldRows(root: Document): Element[] {
  const rows = new Set<Element>();
  for (const el of root.querySelectorAll(FIELD_SELECTOR)) {
    if (!isEvidence(el) || !FIELD_HINTS.some(({ parts }) =>
      parts.some((part) => el.id.toUpperCase().includes(part)))) continue;
    const row = el.closest(ROW_SELECTOR);
    if (row) rows.add(row);
  }
  return [...rows];
}

function isSelectedRow(row: Element): boolean {
  // An arbitrary checked business field is not a row-selection signal.
  return row.getAttribute("aria-selected") === "true" && isEvidence(row);
}

function readPack(root: Document | Element): ProcessPack {
  const pack: ProcessPack = {};
  for (const { key, parts } of FIELD_HINTS) {
    for (const part of parts) {
      const value = readFieldValue(root, part);
      if (value) {
        pack[key] = value;
        break;
      }
    }
  }
  pack.processInstance ||= readLabelPair(root, /process\s+instance/i);
  pack.processType ||= readLabelPair(root, /process\s+type/i);
  pack.processName ||= readLabelPair(root, /process\s+name/i);
  pack.runControl ||= readLabelPair(root, /run\s+control/i);
  pack.user ||= readLabelPair(root, /(?:run\s+)?user|requestor|operator/i);
  pack.runStatus ||= readLabelPair(root, /(?:run|process)\s+status/i);
  return pack;
}

export function isProcessMonitorPage(doc: Document = document, parsed?: ParsedPsUrl): boolean {
  const component = parsed?.component || "";
  if (PROCESS_MONITOR_COMPONENTS.has(component.toUpperCase())) return true;
  const target = getTargetDocument(doc);
  return Array.from(target.querySelectorAll(
    '[id*="PRCSINSTANCE" i], [id*="PRCSMON" i], [id*="PROCESSINSTANCE" i]',
  )).some(isEvidence);
}

/** AD-03: scrape visible Process Monitor cells for ticket handoff. */
export function collectProcessPack(doc: Document = document, parsed?: ParsedPsUrl): ProcessPack | null {
  if (!isProcessMonitorPage(doc, parsed)) return null;

  const target = getTargetDocument(doc);
  const instances = instanceMarkers(target);
  const rows = [...new Set(instances.map(({ el }) => el.closest(ROW_SELECTOR)).filter((row): row is Element => !!row))];
  const selected = rows.filter(isSelectedRow);
  if (selected.length > 1) return null;

  // Each actual result row is a separate process context, even when two rows
  // happen to display the same instance. Only a clear UI selection resolves it.
  if (rows.length > 1 && selected.length !== 1) return null;
  if (instances.some(({ el }) => !el.closest(ROW_SELECTOR)) && rows.length) return null;
  if (!rows.length && instances.length > 1) return null;

  const row = selected[0] || rows[0];
  if (row && new Set(instanceMarkers(row).map(({ value }) => value)).size > 1) return null;

  const evidenceRows = fieldRows(target);
  if (!row && evidenceRows.length > 1) {
    // Separate labelled detail lines may form one record; independent result
    // rows without an instance cannot be assigned to one process.
    const labelledDetails = evidenceRows.every((evidenceRow) =>
      Array.from(evidenceRow.querySelectorAll(LABEL_SELECTOR)).some((el) =>
        isEvidence(el) && /process\s+|run\s+|requestor|operator/i.test(cleanValue(el.textContent || ""))));
    if (!labelledDetails) return null;
  }

  // A labelled detail table stores one field per row. A result row has its
  // process instance in a cell without an adjacent "Process Instance" label.
  const detailRow = row && Array.from(row.querySelectorAll(LABEL_SELECTOR))
    .some((el) => isEvidence(el) && /process\s+instance/i.test(cleanValue(el.textContent || "")));
  const table = detailRow ? row?.closest("table") : null;
  const detailTable = table && Array.from(table.querySelectorAll("tr")).filter(isEvidence).every(detail =>
    detail.closest("table") === table && Array.from(detail.querySelectorAll(LABEL_SELECTOR)).some(label =>
      isEvidence(label) && /^(?:process instance|process type|process name|run control|(?:run )?user|requestor|operator|run status|process status)\s*:?$/i.test(cleanValue(label.textContent || ""))));
  const root = row ? (detailTable ? table : row) : target;
  const pack = readPack(root);
  return Object.values(pack).some(Boolean) ? pack : null;
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
