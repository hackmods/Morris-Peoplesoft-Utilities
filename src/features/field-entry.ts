/**
 * Field Entry toolkit (FE-01..04) — capture / paste / sheet / find-replace
 * for visible editable PeopleSoft fields. Session buffer is in-memory only;
 * named profiles persist in chrome.storage.local with business-key warnings.
 */
import { getInspectorContentRoot } from "../adapters/ps-page";
import {
  normalizeFieldEntryProfiles,
  type FieldEntryProfile,
  type FieldEntryRow,
} from "../storage/schema";
import { nearbyPageLabel, parseRecField } from "./field-inspector";

const FIELD_SELECTOR = [
  "input:not([type=hidden])",
  "select",
  "textarea",
].join(",");

const PREVIEW_STYLE_ID = "mpu-field-entry-style";
const PREVIEW_ATTR = "data-mpu-fe-status";

export type FieldEntryMatchStatus = "willWrite" | "unchanged" | "skipped" | "unmatched";

export interface FieldEntryMatch {
  row: FieldEntryRow;
  status: FieldEntryMatchStatus;
  reason?: string;
  element?: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  currentValue?: string;
  key: string;
}

export interface FieldEntryEligibilityReport {
  matches: FieldEntryMatch[];
  willWrite: number;
  unchanged: number;
  skipped: number;
  unmatched: number;
}

/** In-memory session buffer (not persisted). */
let sessionBuffer: FieldEntryRow[] = [];

export function getSessionBuffer(): FieldEntryRow[] {
  return sessionBuffer.map((r) => ({ ...r }));
}

export function setSessionBuffer(rows: FieldEntryRow[]): void {
  sessionBuffer = rows.map((r) => ({ ...r }));
}

export function clearSessionBuffer(): void {
  sessionBuffer = [];
}

export function fieldEntryKey(row: Pick<FieldEntryRow, "record" | "field" | "occurrence">): string {
  const occ = row.occurrence != null && row.occurrence !== "" ? `$${row.occurrence}` : "";
  return `${row.record}.${row.field}${occ}`;
}

function collectDocs(root: Document, out: Document[] = []): Document[] {
  out.push(root);
  const frames = root.querySelectorAll("iframe");
  for (const frame of frames) {
    try {
      const child = (frame as HTMLIFrameElement).contentDocument;
      if (child?.body) collectDocs(child, out);
    } catch {
      /* cross-origin */
    }
  }
  return out;
}

function isPasswordControl(el: Element): boolean {
  if (!(el instanceof HTMLInputElement)) return false;
  const t = (el.type || "").toLowerCase();
  if (t === "password") return true;
  const id = (el.id || "").toLowerCase();
  const name = (el.name || "").toLowerCase();
  return /password|passwd|pwd/.test(id) || /password|passwd|pwd/.test(name);
}

function describeSkipReason(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  if (el.disabled || el.getAttribute("aria-disabled") === "true") return "disabled";
  if (
    (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
    (el.readOnly || el.getAttribute("aria-readonly") === "true")
  ) {
    return "readonly";
  }
  return "not-editable";
}

function resolveFieldPageLabel(node: HTMLElement, parsedLabel?: string): string | undefined {
  // Prefer an immediate previous-sibling label (common Classic layout) before
  // broader nearbyPageLabel, which can pick the first label in a shared form/table.
  const prev = node.previousElementSibling;
  if (prev && prev.matches("label, .PSEDITBOXLABEL, .PSDROPDOWNLABEL, .PSlabel, .ps_box-label")) {
    const t = prev.textContent?.replace(/\s+/g, " ").trim();
    if (t && t.length < 120) return t;
  }
  const fromNearby = nearbyPageLabel(node) || parsedLabel;
  if (fromNearby) return fromNearby;
  return undefined;
}

function controlIsEditable(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean {
  if (isPasswordControl(el)) return false;
  if (el.disabled) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.readOnly) return false;
  }
  if (el.getAttribute("aria-disabled") === "true") return false;
  if (el.getAttribute("aria-readonly") === "true") return false;
  return true;
}

function readControlValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  return el.value ?? "";
}

function peerBasesFromDocs(docs: Document[]): string[] {
  const bases: string[] = [];
  for (const doc of docs) {
    for (const node of Array.from(doc.querySelectorAll(FIELD_SELECTOR))) {
      if (!(node instanceof HTMLElement)) continue;
      const id = node.id;
      if (!id || !id.includes("_")) continue;
      // Exclude credential hosts from peer pool so they do not poison RECORD inference
      if (isPasswordControl(node)) continue;
      const dollar = id.indexOf("$");
      bases.push(dollar >= 0 ? id.slice(0, dollar) : id);
    }
  }
  return bases;
}

export interface PageFieldHit {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  row: FieldEntryRow;
  editable: boolean;
  skipReason?: string;
}

/** Enumerate PeopleSoft-looking controls on the page (Classic + Fluid frames). */
export function listPageFields(topDoc: Document = document): PageFieldHit[] {
  const root = getInspectorContentRoot(topDoc);
  const docs = collectDocs(root);
  const peers = peerBasesFromDocs(docs);
  const hits: PageFieldHit[] = [];

  for (const doc of docs) {
    for (const node of Array.from(doc.querySelectorAll(FIELD_SELECTOR))) {
      if (!(node instanceof HTMLElement)) continue;
      if (!node.id || !node.id.includes("_")) continue;
      if (node.closest("#mpu-bar, #mpu-dialog, .mpu-dialog-backdrop, #psutil")) continue;

      const parsed = parseRecField(node.id, peers, node);
      if (!parsed.record || !parsed.field) continue;

      const label = resolveFieldPageLabel(node, parsed.pageLabel);
      const baseRow: FieldEntryRow = {
        record: parsed.record,
        field: parsed.field,
        occurrence: parsed.occurrence,
        value: "",
        pageLabel: label,
      };

      if (!(node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement)) {
        continue;
      }

      if (isPasswordControl(node)) {
        hits.push({
          element: node,
          row: { ...baseRow, value: "" },
          editable: false,
          skipReason: "password",
        });
        continue;
      }

      const editable = controlIsEditable(node);
      hits.push({
        element: node,
        row: { ...baseRow, value: readControlValue(node) },
        editable,
        skipReason: editable ? undefined : describeSkipReason(node),
      });
    }
  }
  return hits;
}

/** FE-01: capture editable field values into session buffer. */
export function captureFieldValues(topDoc: Document = document): FieldEntryRow[] {
  const rows: FieldEntryRow[] = [];
  const seen = new Set<string>();
  for (const hit of listPageFields(topDoc)) {
    if (!hit.editable) continue;
    const key = fieldEntryKey(hit.row);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ ...hit.row });
  }
  setSessionBuffer(rows);
  return rows;
}

function findHitForRow(hits: PageFieldHit[], row: FieldEntryRow): PageFieldHit | undefined {
  const exact = hits.find(
    (h) =>
      h.row.record === row.record &&
      h.row.field === row.field &&
      (row.occurrence == null || row.occurrence === ""
        ? true
        : h.row.occurrence === row.occurrence),
  );
  if (exact) return exact;
  // Fall back to first RECORD.FIELD ignoring occurrence when buffer has no occ
  if (row.occurrence == null || row.occurrence === "") {
    return hits.find((h) => h.row.record === row.record && h.row.field === row.field);
  }
  return undefined;
}

/** Match buffer rows against the open page (eligibility). */
export function matchBufferToPage(
  buffer: FieldEntryRow[],
  topDoc: Document = document,
): FieldEntryEligibilityReport {
  const hits = listPageFields(topDoc);
  const matches: FieldEntryMatch[] = [];

  for (const row of buffer) {
    const key = fieldEntryKey(row);
    const hit = findHitForRow(hits, row);
    if (!hit) {
      matches.push({ row, status: "unmatched", reason: "no matching field", key });
      continue;
    }
    if (!hit.editable) {
      matches.push({
        row,
        status: "skipped",
        reason: hit.skipReason || "not editable",
        element: hit.element,
        currentValue: hit.row.value,
        key,
      });
      continue;
    }
    const current = readControlValue(hit.element);
    const maxLen =
      hit.element instanceof HTMLInputElement || hit.element instanceof HTMLTextAreaElement
        ? hit.element.maxLength
        : -1;
    if (typeof maxLen === "number" && maxLen > 0 && maxLen < 100000 && row.value.length > maxLen) {
      matches.push({
        row,
        status: "skipped",
        reason: `exceeds maxlength ${maxLen}`,
        element: hit.element,
        currentValue: current,
        key,
      });
      continue;
    }
    if (current === row.value) {
      matches.push({
        row,
        status: "unchanged",
        element: hit.element,
        currentValue: current,
        key,
      });
      continue;
    }
    matches.push({
      row,
      status: "willWrite",
      element: hit.element,
      currentValue: current,
      key,
    });
  }

  return {
    matches,
    willWrite: matches.filter((m) => m.status === "willWrite").length,
    unchanged: matches.filter((m) => m.status === "unchanged").length,
    skipped: matches.filter((m) => m.status === "skipped").length,
    unmatched: matches.filter((m) => m.status === "unmatched").length,
  };
}

function ensurePreviewStyles(doc: Document): void {
  if (doc.getElementById(PREVIEW_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = PREVIEW_STYLE_ID;
  style.textContent = `
    [${PREVIEW_ATTR}="willWrite"] {
      outline: 2px solid #c47a00 !important;
      outline-offset: 1px;
      box-shadow: 0 0 0 2px rgba(196, 122, 0, 0.25);
    }
    [${PREVIEW_ATTR}="unchanged"] {
      outline: 2px solid #5a8f5a !important;
      outline-offset: 1px;
    }
    [${PREVIEW_ATTR}="skipped"] {
      outline: 2px dashed #888 !important;
      outline-offset: 1px;
    }
    @media (prefers-contrast: more), (forced-colors: active) {
      [${PREVIEW_ATTR}] {
        outline-width: 3px !important;
        outline-color: Highlight !important;
      }
    }
  `;
  (doc.head || doc.documentElement).appendChild(style);
}

/** Clear eligibility highlight overlays. */
export function clearEligibilityPreview(topDoc: Document = document): void {
  const root = getInspectorContentRoot(topDoc);
  for (const doc of collectDocs(root)) {
    doc.querySelectorAll(`[${PREVIEW_ATTR}]`).forEach((el) => {
      el.removeAttribute(PREVIEW_ATTR);
    });
  }
}

/** Highlight matched fields for eligibility preview. */
export function showEligibilityPreview(report: FieldEntryEligibilityReport, topDoc: Document = document): void {
  clearEligibilityPreview(topDoc);
  const root = getInspectorContentRoot(topDoc);
  for (const doc of collectDocs(root)) {
    ensurePreviewStyles(doc);
  }
  for (const m of report.matches) {
    if (!m.element) continue;
    if (m.status === "unmatched") continue;
    m.element.setAttribute(PREVIEW_ATTR, m.status);
  }
}

function dispatchValueEvents(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  // Classic PeopleSoft often listens for these
  try {
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  } catch {
    /* ignore */
  }
}

/** Write willWrite matches; returns count applied. */
export function applyEligibilityReport(
  report: FieldEntryEligibilityReport,
  topDoc: Document = document,
): number {
  let applied = 0;
  const written: HTMLElement[] = [];
  for (const m of report.matches) {
    if (m.status !== "willWrite" || !m.element) continue;
    if (isPasswordControl(m.element) || !controlIsEditable(m.element)) continue;
    m.element.value = m.row.value;
    dispatchValueEvents(m.element);
    m.element.setAttribute("data-mpu-fe-written", "1");
    written.push(m.element);
    applied += 1;
  }
  clearEligibilityPreview(topDoc);
  // Soft-notify Classic page-context hooks when present
  tryInjectFieldEntryWrite(topDoc);
  // Clean write markers shortly after inject loads
  window.setTimeout(() => {
    for (const el of written) {
      el.removeAttribute("data-mpu-fe-written");
    }
  }, 500);
  return applied;
}

function tryInjectFieldEntryWrite(topDoc: Document): void {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime?.getURL) return;
    const path = "inject/field-entry-write.js";
    const existing = topDoc.querySelector(`script[data-mpu-inject="${path}"]`);
    existing?.remove();
    const s = topDoc.createElement("script");
    s.src = chrome.runtime.getURL(path);
    s.dataset.mpuInject = path;
    s.onload = () => s.remove();
    (topDoc.head || topDoc.documentElement).appendChild(s);
  } catch {
    /* ignore */
  }
}

export function summarizeEligibility(report: FieldEntryEligibilityReport): string {
  return `Will write ${report.willWrite} · unchanged ${report.unchanged} · skipped ${report.skipped} · unmatched ${report.unmatched}`;
}

/** Parse TSV or simple CSV into header + first data row as FieldEntryRows. */
export function parseSheetPaste(text: string): { rows: FieldEntryRow[]; error?: string } {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return { rows: [], error: "Nothing to paste" };

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], error: "Need a header row and at least one data row" };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitDelimited(lines[0], delimiter).map((h) => h.trim());
  const values = splitDelimited(lines[1], delimiter);

  const rows: FieldEntryRow[] = [];
  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i];
    if (!header) continue;
    const value = values[i] ?? "";
    const rf = parseRecordFieldHeader(header);
    if (rf) {
      rows.push({ record: rf.record, field: rf.field, value });
      continue;
    }
    // Label headers resolved later against page labels
    rows.push({
      record: "__LABEL__",
      field: header,
      value,
      pageLabel: header,
    });
  }

  if (!rows.length) return { rows: [], error: "No columns recognized" };
  return { rows };
}

function splitDelimited(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t");
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseRecordFieldHeader(header: string): { record: string; field: string } | null {
  const m = header.trim().match(/^([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z][A-Za-z0-9_]*)$/);
  if (!m) return null;
  return { record: m[1], field: m[2] };
}

/**
 * Resolve `__LABEL__` sheet columns against current page labels → RECORD.FIELD.
 * Drops unresolved label columns.
 */
export function resolveLabelRowsAgainstPage(
  rows: FieldEntryRow[],
  topDoc: Document = document,
): FieldEntryRow[] {
  const hits = listPageFields(topDoc);
  const labelMap = new Map<string, PageFieldHit>();
  for (const h of hits) {
    const label = (h.row.pageLabel || "").trim().toLowerCase();
    if (label && !labelMap.has(label)) labelMap.set(label, h);
  }

  const out: FieldEntryRow[] = [];
  for (const row of rows) {
    if (row.record !== "__LABEL__") {
      out.push(row);
      continue;
    }
    const key = (row.pageLabel || row.field || "").trim().toLowerCase();
    const hit = labelMap.get(key);
    if (!hit) continue;
    out.push({
      record: hit.row.record,
      field: hit.row.field,
      occurrence: hit.row.occurrence,
      value: row.value,
      pageLabel: hit.row.pageLabel,
    });
  }
  return out;
}

export interface FindReplacePair {
  find: string;
  replace: string;
}

/** Build buffer from find→replace against current editable values. */
export function buildFindReplaceBuffer(
  pairs: FindReplacePair[],
  topDoc: Document = document,
  caseInsensitive = false,
): FieldEntryRow[] {
  const norm = (s: string) => (caseInsensitive ? s.toLowerCase() : s);
  const map = pairs
    .filter((p) => p.find !== "")
    .map((p) => ({ find: p.find, replace: p.replace, key: norm(p.find) }));

  const rows: FieldEntryRow[] = [];
  for (const hit of listPageFields(topDoc)) {
    if (!hit.editable) continue;
    const cur = hit.row.value;
    const pair = map.find((p) => p.key === norm(cur));
    if (!pair) continue;
    rows.push({ ...hit.row, value: pair.replace });
  }
  return rows;
}

export function profilesToExportJson(profiles: FieldEntryProfile[]): string {
  return JSON.stringify(
    {
      mpuFieldEntryProfiles: true,
      version: 1,
      profiles,
    },
    null,
    2,
  );
}

export function parseProfilesImportJson(text: string): {
  profiles: FieldEntryProfile[];
  error?: string;
} {
  try {
    const data = JSON.parse(text) as {
      mpuFieldEntryProfiles?: boolean;
      profiles?: unknown;
    };
    if (!data || data.mpuFieldEntryProfiles !== true || !Array.isArray(data.profiles)) {
      return { profiles: [], error: "Not an MPU Field Entry profiles export" };
    }
    return { profiles: normalizeFieldEntryProfiles(data.profiles) };
  } catch {
    return { profiles: [], error: "Invalid JSON" };
  }
}
