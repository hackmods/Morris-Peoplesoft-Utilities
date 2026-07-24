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

function collectDocs(root: Document, out: Document[] = [], seen = new Set<Document>()): Document[] {
  if (seen.has(root)) return out;
  seen.add(root);
  out.push(root);
  const frames = root.querySelectorAll("iframe");
  for (const frame of frames) {
    try {
      const child = (frame as HTMLIFrameElement).contentDocument;
      if (child?.body) collectDocs(child, out, seen);
    } catch {
      /* cross-origin */
    }
  }
  return out;
}

/**
 * Classic TargetContent + Fluid shells + same-origin modal/popup frames
 * (PT_MODAL / ptModFrame / role=dialog hosts used by Modify a Person lookups).
 */
export function collectFieldEntryDocs(topDoc: Document = document): Document[] {
  const seen = new Set<Document>();
  const out: Document[] = [];
  collectDocs(topDoc, out, seen);
  try {
    const content = getInspectorContentRoot(topDoc);
    if (content !== topDoc) collectDocs(content, out, seen);
  } catch {
    /* ignore */
  }
  // Explicit modal hosts on the portal document (often siblings of the content frame)
  const modalSelectors = [
    'iframe[id*="ptModFrame" i]',
    'iframe[id*="PT_MODAL" i]',
    'iframe[name*="Modal" i]',
    'iframe[id*="popup" i]',
    '[id*="pt_modals"] iframe',
    '[class*="ps_modal"] iframe',
    '[role="dialog"] iframe',
  ];
  for (const sel of modalSelectors) {
    try {
      for (const frame of Array.from(topDoc.querySelectorAll(sel))) {
        try {
          const child = (frame as HTMLIFrameElement).contentDocument;
          if (child?.body) collectDocs(child, out, seen);
        } catch {
          /* cross-origin */
        }
      }
    } catch {
      /* bad selector in older engines */
    }
  }
  // Also scan open dialog containers that host fields without an iframe
  for (const dlg of Array.from(
    topDoc.querySelectorAll('[role="dialog"], .ui-dialog, #ptModals, .ps_modal, .ps_box-modal'),
  )) {
    if (dlg.ownerDocument && !seen.has(dlg.ownerDocument)) {
      collectDocs(dlg.ownerDocument, out, seen);
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

/** Peers that share the same leading id token (keeps PERSONAL_DATA_* vs ADDRESSES_* separate). */
function peersForBase(base: string, all: string[]): string[] {
  const token = base.split("_")[0];
  if (!token) return all;
  const related = all.filter((p) => p === base || p.startsWith(`${token}_`) || p.split("_")[0] === token);
  return related.length >= 2 ? related : all;
}

export interface PageFieldHit {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  row: FieldEntryRow;
  editable: boolean;
  skipReason?: string;
}

/** Enumerate PeopleSoft-looking controls on the page (Classic + Fluid + modals). */
export function listPageFields(topDoc: Document = document): PageFieldHit[] {
  const docs = collectFieldEntryDocs(topDoc);
  const peers = peerBasesFromDocs(docs);
  const hits: PageFieldHit[] = [];

  for (const doc of docs) {
    for (const node of Array.from(doc.querySelectorAll(FIELD_SELECTOR))) {
      if (!(node instanceof HTMLElement)) continue;
      if (!node.id || !node.id.includes("_")) continue;
      if (node.closest("#mpu-bar, #mpu-dialog, .mpu-dialog-backdrop, #psutil")) continue;

      const dollar = node.id.indexOf("$");
      const baseId = dollar >= 0 ? node.id.slice(0, dollar) : node.id;
      const parsed = parseRecField(node.id, peersForBase(baseId, peers), node);
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
  const wantOcc = row.occurrence != null && row.occurrence !== "" ? row.occurrence : undefined;

  const exact = hits.find((h) => {
    if (h.row.record !== row.record || h.row.field !== row.field) return false;
    if (wantOcc == null) return true;
    if (h.row.occurrence === wantOcc) return true;
    // $0 and bare (no dollar) are the same first grid row in many Classic pages
    return wantOcc === "0" && (h.row.occurrence == null || h.row.occurrence === "");
  });
  if (exact) return exact;

  if (wantOcc == null || wantOcc === "") {
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
  for (const doc of collectFieldEntryDocs(topDoc)) {
    doc.querySelectorAll(`[${PREVIEW_ATTR}]`).forEach((el) => {
      el.removeAttribute(PREVIEW_ATTR);
    });
  }
}

/** Highlight matched fields for eligibility preview. */
export function showEligibilityPreview(report: FieldEntryEligibilityReport, topDoc: Document = document): void {
  clearEligibilityPreview(topDoc);
  for (const doc of collectFieldEntryDocs(topDoc)) {
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

export interface SheetParseResult {
  /** Flattened buffer rows; multi-row sheets set `occurrence` to 0-based line index */
  rows: FieldEntryRow[];
  /** Number of spreadsheet data lines (excluding header) */
  dataRowCount: number;
  error?: string;
}

/**
 * Parse TSV/CSV. Multiple data rows become grid occurrences ($0, $1, …).
 * A single data row leaves occurrence unset so bare ids (no $) still match.
 */
export function parseSheetPaste(text: string): SheetParseResult {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return { rows: [], dataRowCount: 0, error: "Nothing to paste" };

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], dataRowCount: 0, error: "Need a header row and at least one data row" };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitDelimited(lines[0], delimiter).map((h) => h.trim());
  const dataLines = lines.slice(1);
  const multi = dataLines.length > 1;
  const rows: FieldEntryRow[] = [];

  for (let r = 0; r < dataLines.length; r += 1) {
    const values = splitDelimited(dataLines[r], delimiter);
    for (let i = 0; i < headers.length; i += 1) {
      const header = headers[i];
      if (!header) continue;
      const value = values[i] ?? "";
      const occ = multi ? String(r) : undefined;
      const rf = parseRecordFieldHeader(header);
      if (rf) {
        rows.push({
          record: rf.record,
          field: rf.field,
          value,
          ...(occ != null ? { occurrence: occ } : {}),
        });
        continue;
      }
      rows.push({
        record: "__LABEL__",
        field: header,
        value,
        pageLabel: header,
        ...(occ != null ? { occurrence: occ } : {}),
      });
    }
  }

  if (!rows.length) return { rows: [], dataRowCount: 0, error: "No columns recognized" };
  return { rows, dataRowCount: dataLines.length };
}

/**
 * Resolve `__LABEL__` columns against page labels, preserving occurrence.
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
      occurrence: row.occurrence ?? hit.row.occurrence,
      value: row.value,
      pageLabel: hit.row.pageLabel,
    });
  }
  return out;
}

/** Highest numeric $occ for a record currently on the page (−1 if none). */
export function maxOccurrenceForRecord(record: string, topDoc: Document = document): number {
  let max = -1;
  for (const hit of listPageFields(topDoc)) {
    if (hit.row.record !== record) continue;
    const occ = hit.row.occurrence;
    if (occ == null || occ === "") {
      max = Math.max(max, 0);
      continue;
    }
    const n = Number.parseInt(occ, 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}

const ADD_ROW_SELECTOR = [
  "[data-mpu-fe-add-row]",
  'a[id*="ICAdd"]',
  'a[id*="$new"]',
  'a[id*="ADDROW"]',
  'img[id*="ICAdd"]',
  'button[id*="ICAdd"]',
  'input[type="button"][id*="ICAdd"]',
  'a[title*="Add Row"]',
  'a[title*="Insert Row"]',
  'button[title*="Add Row"]',
  'img[alt*="Add Row"]',
  'img[title*="Add Row"]',
].join(", ");

/** Find a delivered (or fixture) Add Row control. */
export function findAddRowControl(topDoc: Document = document): HTMLElement | null {
  for (const doc of collectFieldEntryDocs(topDoc)) {
    try {
      const el = doc.querySelector(ADD_ROW_SELECTOR);
      if (el instanceof HTMLElement) return el;
    } catch {
      /* ignore selector issues per document */
    }
  }
  return null;
}

export interface EnsureGridRowsResult {
  needed: number;
  existing: number;
  clicked: number;
  ok: boolean;
  message: string;
}

/**
 * Click Add Row until the page has enough grid occurrences for `record`
 * (0-based count = neededRows). Soft-fail if no Add control or clicks stall.
 */
export function ensureGridRows(
  topDoc: Document,
  neededRows: number,
  record: string,
  opts: { maxClicks?: number } = {},
): EnsureGridRowsResult {
  const maxClicks = opts.maxClicks ?? 40;
  if (neededRows <= 1) {
    return {
      needed: neededRows,
      existing: Math.max(0, maxOccurrenceForRecord(record, topDoc) + 1),
      clicked: 0,
      ok: true,
      message: "Single row — no grid expand",
    };
  }

  let existing = maxOccurrenceForRecord(record, topDoc) + 1;
  // Bare fields without $ count as 1 row when present
  if (existing <= 0) existing = listPageFields(topDoc).some((h) => h.row.record === record) ? 1 : 0;

  let clicked = 0;
  while (existing < neededRows && clicked < maxClicks) {
    const btn = findAddRowControl(topDoc);
    if (!btn) {
      return {
        needed: neededRows,
        existing,
        clicked,
        ok: false,
        message: `Need ${neededRows} grid rows but only ${existing} exist — no Add Row control found`,
      };
    }
    try {
      btn.click();
    } catch {
      return {
        needed: neededRows,
        existing,
        clicked,
        ok: false,
        message: "Add Row click failed",
      };
    }
    clicked += 1;
    const next = maxOccurrenceForRecord(record, topDoc) + 1;
    if (next <= existing) {
      // Fixture may create the row synchronously under a different path; re-count
      const recount = maxOccurrenceForRecord(record, topDoc) + 1;
      if (recount <= existing) {
        return {
          needed: neededRows,
          existing,
          clicked,
          ok: false,
          message: `Add Row clicked but grid for ${record} did not grow (still ${existing} rows)`,
        };
      }
      existing = recount;
    } else {
      existing = next;
    }
  }

  const ok = existing >= neededRows;
  return {
    needed: neededRows,
    existing,
    clicked,
    ok,
    message: ok
      ? `Grid ready — ${existing} row(s) for ${record}`
      : `Only ${existing}/${neededRows} rows for ${record} after ${clicked} Add Row click(s)`,
  };
}

/**
 * Prepare a multi-row sheet buffer: expand grid via Add Row, then return rows for preview.
 */
export function prepareSheetBuffer(
  text: string,
  topDoc: Document = document,
): { rows: FieldEntryRow[]; error?: string; grid?: EnsureGridRowsResult } {
  const parsed = parseSheetPaste(text);
  if (parsed.error || !parsed.rows.length) {
    return { rows: [], error: parsed.error || "No columns recognized" };
  }
  let resolved = resolveLabelRowsAgainstPage(parsed.rows, topDoc);
  if (!resolved.length) {
    return { rows: [], error: "No columns matched RECORD.FIELD or page labels" };
  }

  let grid: EnsureGridRowsResult | undefined;
  if (parsed.dataRowCount > 1) {
    const record =
      resolved.find((r) => r.record && r.record !== "__LABEL__")?.record ||
      listPageFields(topDoc).find((h) => h.editable)?.row.record ||
      "";
    if (record) {
      grid = ensureGridRows(topDoc, parsed.dataRowCount, record);
      if (!grid.ok) {
        return {
          rows: resolved,
          error: grid.message,
          grid,
        };
      }
      // Re-resolve after rows added (labels / peers may change)
      resolved = resolveLabelRowsAgainstPage(parsed.rows, topDoc);
    }
  }

  return { rows: resolved, grid };
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
