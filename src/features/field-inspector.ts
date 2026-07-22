import { announce } from "./bar";
import {
  findContentFrameElement,
  getInspectorContentRoot,
} from "../adapters/ps-page";
import type { FieldCopyFormat } from "../storage/schema";

const AREA = "mpu-recfield-area";
const ICON = "mpu-recfield-icon";
const LOCKED_BORDER = "solid 2px #5DA027";
const ACTIVE_BORDER = "solid 2px #E36B22";
const ORANGE = "#E36B22";
const GREEN = "#5DA027";
const STYLE_ID = "mpu-field-inspector-style";

/** Match Classic + Fluid PeopleSoft field hosts. */
const FIELD_SELECTOR = [
  "input:not([type=hidden])",
  "select",
  "textarea",
  "span.PSEDITBOX_DISPONLY",
  "span.PSDROPDOWNLIST_DISPONLY",
  "span.PALEVEL0PRIMARY",
  "span.ps_box-value",
  ".ps_box-edit input",
  ".ps_box-control input",
  ".ps_box-select select",
  ".ps_box-dropdown select",
  "a",
].join(",");

let active = false;
let lockedId: string | null = null;
let topDocRef: Document = document;
let targetDocRef: Document = document;
let frameLoadHandler: (() => void) | null = null;
/** Content iframes (portal + nested Fluid→Classic) we attached load listeners to. */
let frameLoadEls: HTMLIFrameElement[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let mutationObserver: MutationObserver | null = null;
let reinjectTimer: ReturnType<typeof setTimeout> | null = null;
let viewportBound = false;
let viewportScrollHandler: ((e: Event) => void) | null = null;
let viewportResizeHandler: ((e: Event) => void) | null = null;
/** Windows we attached scroll/resize to (portal + Classic/Fluid content frames). */
let viewportWindows: Window[] = [];
let applying = false;
/** Base ids (no $occ) seen on the current page — used to split RECORD vs FIELD. */
let peerFieldBases: string[] = [];
/** Avoid re-entrant frame rebinding while handling a nested load. */
let rebindingFrames = false;

export interface ParsedRecField {
  /** Full element id */
  raw: string;
  /** Id with $occurrence removed */
  base: string;
  record?: string;
  field?: string;
  /** Occurrence / row index after $ */
  occurrence?: string;
  /** Nearby page label text when found */
  pageLabel?: string;
  /** Work/derived record heuristic */
  workRecord?: boolean;
  /** HTML input type when applicable (UX-05) */
  inputType?: string;
  /** maxlength attribute when > 0 (UX-05) */
  maxLength?: number;
  /** disabled / aria-disabled (UX-05) */
  disabled?: boolean;
  /** PC-04: prompt / display-only / deferred hints from DOM */
  contextChips?: FieldContextChip[];
}

export type FieldContextChip = "Prompt" | "Display" | "Deferred";

const PROMPT_SELECTOR =
  'img[src*="PROMPT"], img[alt*="prompt" i], img[title*="prompt" i], .PTSEARCH, .PTLOOKUP, .PSPROMPT, [class*="prompt" i], a[id*="PROMPT" i], a[id*="$prompt" i]';

/** PC-04: infer prompt / display-only / deferred from DOM near the field host. */
export function detectFieldContextChips(el: Element | null | undefined): FieldContextChip[] {
  if (!el) return [];
  const chips = new Set<FieldContextChip>();
  const html = el as HTMLElement;
  const id = html.id || "";
  const tag = html.tagName?.toLowerCase() || "";

  if (
    html.matches?.(
      "span.PSEDITBOX_DISPONLY, span.PSDROPDOWNLIST_DISPONLY, span.ps_box-value, [readonly], [aria-readonly='true']",
    )
  ) {
    if (
      html.classList.contains("PSEDITBOX_DISPONLY") ||
      html.classList.contains("PSDROPDOWNLIST_DISPONLY") ||
      html.classList.contains("ps_box-value")
    ) {
      chips.add("Display");
    }
  }

  const scope =
    html.closest(
      "tr, .ps_box-group, .ps_box-control, .ps_box-widget, .ps_box-edit, td, th, .ps-field",
    ) || html.parentElement;

  if (scope) {
    if (scope.querySelector(PROMPT_SELECTOR)) chips.add("Prompt");
    const promptLink = scope.querySelector(
      'a[id*="PROMPT" i], a[id*="$prompt" i], a[title*="lookup" i], a[title*="prompt" i]',
    );
    if (promptLink && promptLink !== html) chips.add("Prompt");
  }

  if (/PROMPT/i.test(id)) chips.add("Prompt");

  const titleBits = [html.getAttribute("title"), html.getAttribute("aria-label"), html.getAttribute("aria-description")]
    .filter(Boolean)
    .join(" ");
  if (/deferred/i.test(titleBits)) chips.add("Deferred");

  if (scope) {
    const scopeText = [
      scope.getAttribute("title"),
      scope.getAttribute("aria-label"),
      scope.querySelector(".ps_box-label, label, .PSEDITBOXLABEL")?.textContent,
    ]
      .filter(Boolean)
      .join(" ");
    if (/deferred\s+process/i.test(scopeText)) chips.add("Deferred");
    if (scope.querySelector('[class*="deferred" i], [id*="DEFERRED" i], [title*="deferred" i]')) {
      chips.add("Deferred");
    }
  }

  if (
    tag === "input" &&
    (html as HTMLInputElement).readOnly &&
    !html.matches(PROMPT_SELECTOR) &&
    !scope?.querySelector(PROMPT_SELECTOR)
  ) {
    chips.add("Display");
  }

  return [...chips];
}

export function fieldNameFromId(id: string): string {
  return id.split("$")[0] || id;
}

export function isWorkRecordName(record: string | undefined): boolean {
  if (!record) return false;
  return /^(DERIVED_|WRK_|WORK_|INSTALLATION$)/i.test(record);
}

/**
 * Infer RECORD from the longest underscore-aligned prefix shared with peer field ids.
 * PeopleSoft HTML ids are RECORD_FIELD[$occ]; both parts may contain underscores.
 */
export function inferRecordName(base: string, peers: string[] = []): string | undefined {
  const pool = [...new Set([base, ...peers].map(fieldNameFromId))].filter((p) => p.includes("_"));
  if (pool.length < 2) return undefined;

  let prefix = pool[0]!;
  for (const p of pool) {
    let i = 0;
    while (i < prefix.length && i < p.length && prefix[i] === p[i]) i += 1;
    prefix = prefix.slice(0, i);
  }
  if (!prefix) return undefined;

  // Align to a full token boundary (…_TOKEN_)
  if (prefix.endsWith("_")) {
    prefix = prefix.slice(0, -1);
  } else {
    const cut = prefix.lastIndexOf("_");
    if (cut <= 0) return undefined;
    prefix = prefix.slice(0, cut);
  }
  if (!prefix || !base.startsWith(`${prefix}_`)) return undefined;

  const sharing = pool.filter((p) => p === prefix || p.startsWith(`${prefix}_`));
  if (sharing.length < 2) return undefined;
  return prefix;
}

/** Find a nearby PeopleSoft / HTML label for BA readability (FI-02). */
export function nearbyPageLabel(el: Element): string | undefined {
  const doc = el.ownerDocument;
  if (!doc) return undefined;
  const id = (el as HTMLElement).id;
  if (id) {
    try {
      const byFor = doc.querySelector(`label[for="${CSS.escape(id)}"]`);
      const t = byFor?.textContent?.replace(/\s+/g, " ").trim();
      if (t) return t;
    } catch {
      /* ignore bad id */
    }
  }

  const scope =
    el.closest(
      "tr, .ps_box-group, .ps_box-control, .ps_box-widget, .ps_box-edit, .ps_box-label, td, th, .ps-field",
    ) || el.parentElement;
  if (!scope) return undefined;

  const label =
    scope.querySelector(
      "label, .PSEDITBOXLABEL, .PSDROPDOWNLABEL, .PSlabel, .ps_box-label, .ps-label, span.PSQRYFIELDLABEL",
    ) || scope.previousElementSibling;
  if (label && label !== el) {
    const t = label.textContent?.replace(/\s+/g, " ").trim();
    if (t && t.length < 120 && !label.classList?.contains?.("mpu-recfield-icon")) return t;
  }

  // Fluid: label often sits as a sibling of .ps_box-control inside .ps_box-group
  const group = el.closest(".ps_box-group");
  const control = el.closest(".ps_box-control");
  const fluidLabel =
    (control?.previousElementSibling?.matches?.(".ps_box-label, label, .ps-label")
      ? control.previousElementSibling
      : null) ||
    group?.querySelector(".ps_box-label, label, .ps-label") ||
    control?.parentElement?.querySelector(".ps_box-label, label, .ps-label");
  const ft = fluidLabel?.textContent?.replace(/\s+/g, " ").trim();
  if (ft && ft.length < 120) return ft;
  return undefined;
}

/** DOM attribute chips for Field Inspector readout (UX-05). */
export function fieldDomAttrs(el: Element | null | undefined): {
  inputType?: string;
  maxLength?: number;
  disabled?: boolean;
} {
  if (!el) return {};
  const html = el as HTMLElement;
  const tag = html.tagName?.toLowerCase();
  let inputType: string | undefined;
  let maxLength: number | undefined;
  let disabled =
    (html as HTMLInputElement).disabled === true ||
    html.getAttribute("aria-disabled") === "true" ||
    html.hasAttribute("disabled");

  if (tag === "input") {
    inputType = (html as HTMLInputElement).type || html.getAttribute("type") || "text";
    const ml = (html as HTMLInputElement).maxLength;
    if (typeof ml === "number" && ml > 0 && ml < 100000) maxLength = ml;
  } else if (tag === "textarea") {
    inputType = "textarea";
    const ml = (html as HTMLTextAreaElement).maxLength;
    if (typeof ml === "number" && ml > 0 && ml < 100000) maxLength = ml;
  } else if (tag === "select") {
    inputType = "select";
  } else if (tag === "a") {
    inputType = "link";
  } else if (tag === "span") {
    inputType = "display";
    disabled = true;
  }

  return { inputType, maxLength, disabled: disabled || undefined };
}

export function parseRecField(
  id: string,
  peers: string[] = peerFieldBases,
  fieldEl?: Element | null,
): ParsedRecField {
  const dollar = id.indexOf("$");
  const base = dollar >= 0 ? id.slice(0, dollar) : id;
  const occurrence = dollar >= 0 ? id.slice(dollar + 1) || undefined : undefined;
  const record = inferRecordName(base, peers);
  const field =
    record && base.startsWith(`${record}_`) ? base.slice(record.length + 1) || undefined : undefined;
  const pageLabel = fieldEl ? nearbyPageLabel(fieldEl) : undefined;
  const attrs = fieldDomAttrs(fieldEl);
  const contextChips = fieldEl ? detectFieldContextChips(fieldEl) : undefined;
  return {
    raw: id,
    base,
    record,
    field,
    occurrence,
    pageLabel,
    workRecord: Boolean(isWorkRecordName(record) || /^(DERIVED_|WRK_|WORK_)/i.test(base)),
    contextChips: contextChips?.length ? contextChips : undefined,
    ...attrs,
  };
}

/** Clipboard / announce form — prefers RECORD.FIELD without row suffix for App Designer paste. */
export function formatRecFieldCopy(
  parsed: ParsedRecField,
  format: FieldCopyFormat = "record.field",
): string {
  const record = parsed.record;
  const field = parsed.field;
  if (format === "ampersand" && record && field) {
    return `&${record}.${field}`;
  }
  if (format === "getfield" && field) {
    return `GetField(Field.${field})`;
  }
  if (record && field) return `${record}.${field}`;
  return parsed.base;
}

/** PC-03: row-aware PeopleCode reference when occurrence is known. */
export function formatGetRowsetCopy(parsed: ParsedRecField): string {
  const record = parsed.record || "RECORD";
  const field = parsed.field || parsed.base || "FIELD";
  const row =
    parsed.occurrence != null && parsed.occurrence !== "" ? parsed.occurrence : "CurrentRowNumber()";
  return `GetLevel0().GetRow(${row}).GetRecord(Record.${record}).GetField(Field.${field})`;
}

/** Human-readable label for announcements / plain-text copy. */
export function formatRecFieldPlain(parsed: ParsedRecField): string {
  const core = formatRecFieldCopy(parsed);
  const occ = parsed.occurrence != null && parsed.occurrence !== "" ? ` (row ${parsed.occurrence})` : "";
  return `${core}${occ}`;
}

export function isFieldInspectorActive(): boolean {
  return active;
}

export function getLockedFieldName(): string | null {
  if (!lockedId) return null;
  return formatRecFieldPlain(parseRecField(lockedId, peerFieldBases, resolveFieldElement(lockedId)));
}

export function getLockedParsedRecField(): ParsedRecField | null {
  if (!lockedId) return null;
  return parseRecField(lockedId, peerFieldBases, resolveFieldElement(lockedId));
}

export function getLockedFieldCopyText(format: FieldCopyFormat = "record.field"): string | null {
  const parsed = getLockedParsedRecField();
  if (!parsed) return null;
  if (format === "getrowset") return formatGetRowsetCopy(parsed);
  return formatRecFieldCopy(parsed, format);
}

export async function copyLockedField(
  doc: Document = document,
  format: FieldCopyFormat = "record.field",
): Promise<boolean> {
  const text = getLockedFieldCopyText(format);
  if (!text) {
    announce(doc, "No locked field to copy — Inspect and click a field icon first");
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    announce(doc, `Copied ${text}`);
    return true;
  } catch {
    announce(doc, "Unable to copy field name");
    return false;
  }
}

/** Real SVG nodes — PeopleSoft CSP often blocks chrome-extension:// and data: img sources. */
function createIcon(doc: Document, stroke: string, fieldId: string): SVGSVGElement {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add(ICON);
  svg.dataset.mpuFieldId = fieldId;
  svg.dataset.mpuStroke = stroke;
  svg.setAttribute("title", "Click to lock record.field name");
  svg.style.cssText =
    "width:12px;height:12px;padding-right:4px;vertical-align:top;cursor:pointer;display:inline-block;flex-shrink:0;";

  const circle = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "6.5");
  circle.setAttribute("cy", "6.5");
  circle.setAttribute("r", "4");
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", stroke);
  circle.setAttribute("stroke-width", "2");

  const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M9.5 9.5L14 14");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");

  svg.appendChild(circle);
  svg.appendChild(path);
  return svg;
}

function setIconStroke(icon: Element, stroke: string): void {
  icon.setAttribute("data-mpu-stroke", stroke);
  if (icon instanceof HTMLElement || icon instanceof SVGElement) {
    (icon as SVGElement).dataset.mpuStroke = stroke;
  }
  icon.querySelectorAll("circle, path").forEach((node) => {
    node.setAttribute("stroke", stroke);
  });
}

function ensureTargetStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${AREA} {
      border: ${ACTIVE_BORDER};
      white-space: nowrap;
      margin: 1px;
      padding: 1px;
      display: inline-block;
      vertical-align: middle;
      box-sizing: border-box;
    }
    .${AREA}[data-mpu-locked="true"] {
      border: ${LOCKED_BORDER};
    }
    .${ICON} {
      width: 12px !important;
      height: 12px !important;
      padding-right: 4px;
      vertical-align: top;
      cursor: pointer;
      display: inline-block;
    }
    @media (prefers-contrast: more), (forced-colors: active) {
      .${AREA} {
        border-width: 3px !important;
        outline: 2px solid CanvasText;
        outline-offset: 1px;
      }
      .${AREA}[data-mpu-locked="true"] {
        outline-color: Highlight;
      }
      .${ICON} {
        forced-color-adjust: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .${AREA}, .${ICON} {
        transition: none !important;
      }
    }
  `;
  (doc.head || doc.documentElement).appendChild(style);
}

function resolveFieldElement(id: string): Element | null {
  for (const doc of collectDocs(targetDocRef)) {
    try {
      const el = doc.getElementById(id) || doc.querySelector(`#${CSS.escape(id)}`);
      if (el) return el;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function setNamePanel(id: string | null): void {
  const panel = topDocRef.getElementById("mpu-recfield-name");
  const copyBtn = topDocRef.getElementById("mpu-copy-field") as HTMLButtonElement | null;
  if (!panel) return;
  panel.hidden = false;

  if (!id) {
    panel.textContent = "";
    panel.removeAttribute("title");
    panel.setAttribute("data-mpu-empty", "true");
    if (copyBtn) copyBtn.hidden = true;
    return;
  }

  panel.removeAttribute("data-mpu-empty");
  const fieldEl = resolveFieldElement(id);
  const parsed = parseRecField(id, peerFieldBases, fieldEl);
  panel.title = formatRecFieldPlain(parsed);
  panel.replaceChildren();

  const addPart = (cls: string, label: string, value: string) => {
    const part = topDocRef.createElement("span");
    part.className = `mpu-rf-part ${cls}`;
    const lbl = topDocRef.createElement("span");
    lbl.className = "mpu-rf-lbl";
    lbl.textContent = label;
    const val = topDocRef.createElement("span");
    val.className = "mpu-rf-val";
    val.textContent = value;
    part.append(lbl, val);
    panel.appendChild(part);
  };

  if (parsed.workRecord) {
    addPart("mpu-rf-work", "Type", "Work");
  }
  if (parsed.contextChips?.length) {
    addPart("mpu-rf-ctx", "Ctx", parsed.contextChips.join(", "));
  }
  if (parsed.pageLabel) {
    addPart("mpu-rf-label", "Label", parsed.pageLabel);
  }
  if (parsed.inputType) {
    addPart("mpu-rf-itype", "HTML", parsed.inputType);
  }
  if (parsed.maxLength != null) {
    addPart("mpu-rf-maxlen", "Max", String(parsed.maxLength));
  }
  if (parsed.disabled) {
    addPart("mpu-rf-dis", "State", "disabled");
  }
  if (parsed.record && parsed.field) {
    addPart("mpu-rf-rec", "Rec", parsed.record);
    addPart("mpu-rf-fld", "Fld", parsed.field);
  } else {
    addPart("mpu-rf-id", "ID", parsed.base);
  }
  if (parsed.occurrence != null && parsed.occurrence !== "") {
    addPart("mpu-rf-occ", "Row", parsed.occurrence);
  }

  if (copyBtn) copyBtn.hidden = !lockedId;
}

function isHtmlElement(node: EventTarget | Node | null | undefined): node is HTMLElement {
  return !!node && (node as Node).nodeType === Node.ELEMENT_NODE && "id" in (node as Element);
}

function findFieldElement(area: Element): HTMLElement | null {
  const el = area.querySelector(FIELD_SELECTOR);
  return isHtmlElement(el) && el.id ? el : null;
}

function clearLocks(target: Document): void {
  for (const doc of collectDocs(target)) {
    doc.querySelectorAll(`.${ICON}`).forEach((node) => {
      setIconStroke(node, ORANGE);
    });
    doc.querySelectorAll(`.${AREA}`).forEach((node) => {
      (node as HTMLElement).style.border = ACTIVE_BORDER;
      (node as HTMLElement).removeAttribute("data-mpu-locked");
    });
  }
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

/** Prefer Fluid box hosts so we wrap a control, not a large group/page container. */
export function preferredFluidBoxHost(node: Element): Element | null {
  if ((node as HTMLElement).matches?.("span.ps_box-value")) return node;

  // Innermost → outermost. Reject hosts that contain multiple PS fields (shared
  // `.ps_box-control` / group wrappers) — those produced one mega orange border
  // around the whole container and skipped sibling fields inside the AREA.
  const candidates = [
    node.closest(".ps_box-edit"),
    node.closest(".ps_box-select"),
    node.closest(".ps_box-dropdown"),
    node.closest(".ps_box-control"),
  ];

  for (const host of candidates) {
    if (host && isTightSingleFieldHost(host, node)) return host;
  }
  return null;
}

/** True when host is a single-field control (or only contains this field). */
export function isTightSingleFieldHost(host: Element, _field: Element): boolean {
  const fields = Array.from(host.querySelectorAll(FIELD_SELECTOR)).filter((el) => {
    if (!isHtmlElement(el) || !el.id || !el.id.includes("_")) return false;
    // Ignore MPU chrome / nested areas
    if (el.closest("#mpu-bar, #mpu-dialog, .mpu-dialog-backdrop")) return false;
    return true;
  });
  if (fields.length <= 1) return true;
  // Multiple PS fields share this host — too wide to wrap
  return false;
}

/**
 * FI-05: only decorate fields near the viewport (plus locked field).
 * Margin keeps a small buffer for partial rows.
 * Zero-size rects (jsdom / not laid out) are treated as visible so Classic tests still decorate.
 *
 * Measure the field (or Fluid box / Fluid grid row) — not a Classic `<tr>`.
 * Entire table rows often report off-screen / wrong geometry from the portal content
 * script, which made Inspect ON with zero icons on Classic TargetContent pages.
 */
export function isFieldInViewport(el: Element, marginPx = 200): boolean {
  const host = preferredFluidBoxHost(el) || el.closest(".ps_grid-row") || el;
  let rect: DOMRect;
  try {
    rect = host.getBoundingClientRect();
  } catch {
    return true;
  }
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return true;
  }
  const view = el.ownerDocument?.defaultView || window;
  const vh = view.innerHeight;
  const vw = view.innerWidth;
  // Unusable viewport metrics → decorate (safer for Classic iframes)
  if (!Number.isFinite(vh) || !Number.isFinite(vw) || (vh <= 0 && vw <= 0)) {
    return true;
  }
  const top = -marginPx;
  const bottom = vh + marginPx;
  const left = -marginPx;
  const right = vw + marginPx;
  return rect.bottom >= top && rect.top <= bottom && rect.right >= left && rect.left <= right;
}

function shouldDecorateField(node: Element): boolean {
  if (lockedId) {
    const id = (node as HTMLElement).id;
    if (id && (id === lockedId || fieldNameFromId(id) === fieldNameFromId(lockedId))) {
      return true;
    }
  }
  return isFieldInViewport(node);
}

function injectIcons(target: Document): number {
  applying = true;
  try {
    removeIcons(target);
    let count = 0;
    const bases: string[] = [];

    for (const doc of collectDocs(target)) {
      ensureTargetStyles(doc);
      const candidates = Array.from(doc.querySelectorAll(FIELD_SELECTOR));
      const wrappedHosts = new Set<Element>();

      for (const node of candidates) {
        if (!isHtmlElement(node)) continue;
        if (!node.id || !node.id.includes("_")) continue;
        if (node.closest("#mpu-bar, #mpu-dialog, .mpu-dialog-backdrop, #psutil")) continue;
        if (node.closest(`.${AREA}`)) continue;

        // Always collect peer bases from the full page for RECORD/FIELD inference
        bases.push(fieldNameFromId(node.id));

        if (!shouldDecorateField(node)) continue;

        const fluidHost = preferredFluidBoxHost(node);
        const wrapTarget = fluidHost || node;
        const parent = wrapTarget.parentElement;
        if (!parent) continue;

        // One AREA per field host — never re-wrap the same target twice.
        if (wrappedHosts.has(wrapTarget)) continue;
        // Already inside an AREA (processed via a prior host wrap)
        if (wrapTarget.closest(`.${AREA}`)) continue;
        if (parent.classList.contains(AREA)) continue;
        wrappedHosts.add(wrapTarget);

        const area = doc.createElement("span");
        area.className = AREA;
        area.style.cssText = `border: ${ACTIVE_BORDER}; white-space: nowrap; margin: 1px; padding: 1px; display: inline-block; vertical-align: middle; box-sizing: border-box;`;

        // Always wrap the tight host/field only — never scoop all parent siblings
        // (that highlighted entire Classic TDs / Fluid containers as one block).
        parent.insertBefore(area, wrapTarget);
        area.appendChild(wrapTarget);

        const field = findFieldElement(area) || (isHtmlElement(node) ? node : null);
        const fieldId = field?.id ?? node.id;

        const icon = createIcon(doc, ORANGE, fieldId);
        area.insertBefore(icon, area.firstChild);
        count += 1;
      }
    }

    peerFieldBases = [...new Set(bases)];

    if (lockedId) {
      for (const doc of collectDocs(target)) {
        const lockedIcon = doc.querySelector(
          `.${ICON}[data-mpu-field-id="${CSS.escape(lockedId)}"]`,
        );
        if (lockedIcon) {
          setIconStroke(lockedIcon, GREEN);
          if (lockedIcon.parentElement) {
            (lockedIcon.parentElement as HTMLElement).style.border = LOCKED_BORDER;
            lockedIcon.parentElement.setAttribute("data-mpu-locked", "true");
          }
          setNamePanel(lockedId);
          break;
        }
      }
    }

    return count;
  } finally {
    // Defer so MutationObserver does not see our own wrap as an external change
    queueMicrotask(() => {
      applying = false;
    });
  }
}

function removeIcons(target: Document): void {
  for (const doc of collectDocs(target)) {
    doc.querySelectorAll(`.${ICON}`).forEach((img) => img.remove());
    doc.querySelectorAll(`.${AREA}`).forEach((area) => {
      const parent = area.parentElement;
      if (!parent) {
        area.remove();
        return;
      }
      while (area.firstChild) {
        parent.insertBefore(area.firstChild, area);
      }
      area.remove();
    });
    doc.getElementById(STYLE_ID)?.remove();
  }
}

function onPointerOver(e: Event): void {
  if (!active || lockedId) return;
  const t = e.target as Element | null;
  const icon = t?.closest?.(`.${ICON}`) as HTMLElement | SVGElement | null;
  const fieldId = icon?.getAttribute?.("data-mpu-field-id") ?? (icon as HTMLElement | null)?.dataset?.mpuFieldId;
  if (!fieldId) return;
  setNamePanel(fieldId);
}

function onPointerOut(e: Event): void {
  if (!active || lockedId) return;
  const t = e.target as Element | null;
  const icon = t?.closest?.(`.${ICON}`);
  if (!icon) return;
  const related = (e as MouseEvent).relatedTarget as Node | null;
  if (related && icon.contains(related)) return;
  setNamePanel(null);
}

function onIconClick(e: MouseEvent): void {
  if (!active) return;
  const t = e.target as Element | null;
  const icon = t?.closest?.(`.${ICON}`) as HTMLElement | SVGElement | null;
  const fieldId =
    icon?.getAttribute?.("data-mpu-field-id") ?? (icon as HTMLElement | null)?.dataset?.mpuFieldId;
  if (!icon || !fieldId) return;
  e.preventDefault();
  e.stopPropagation();

  clearLocks(targetDocRef);
  lockedId = fieldId;
  setIconStroke(icon, GREEN);
  if (icon.parentElement) {
    (icon.parentElement as HTMLElement).style.border = LOCKED_BORDER;
    icon.parentElement.setAttribute("data-mpu-locked", "true");
  }
  setNamePanel(fieldId);
  const parsed = parseRecField(fieldId, peerFieldBases, resolveFieldElement(fieldId));
  const plain = formatRecFieldPlain(parsed);
  const copyText = formatRecFieldCopy(parsed);
  void (async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(copyText);
      announce(topDocRef, `Locked and copied ${copyText}`);
    } catch {
      announce(topDocRef, `Locked field ${plain}`);
    }
  })();
}

function onKey(e: KeyboardEvent): void {
  if (!active) return;
  if (e.key === "Escape") {
    e.preventDefault();
    stopFieldInspector(topDocRef);
  }
}

function bindTarget(target: Document): void {
  for (const doc of collectDocs(target)) {
    doc.addEventListener("mouseover", onPointerOver, true);
    doc.addEventListener("mouseout", onPointerOut, true);
    doc.addEventListener("click", onIconClick, true);
    doc.addEventListener("keydown", onKey, true);
  }
}

function unbindTarget(target: Document): void {
  for (const doc of collectDocs(target)) {
    doc.removeEventListener("mouseover", onPointerOver, true);
    doc.removeEventListener("mouseout", onPointerOut, true);
    doc.removeEventListener("click", onIconClick, true);
    doc.removeEventListener("keydown", onKey, true);
  }
}

function clearPoll(): void {
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function clearReinjectTimer(): void {
  if (reinjectTimer != null) {
    clearTimeout(reinjectTimer);
    reinjectTimer = null;
  }
}

function scheduleReinject(doc: Document): void {
  clearReinjectTimer();
  reinjectTimer = setTimeout(() => {
    reinjectTimer = null;
    if (!active || applying) return;
    applyToTarget(doc);
  }, 200);
}

function onViewportChange(): void {
  if (!active || applying) return;
  scheduleReinject(topDocRef);
}

function detachViewportListeners(): void {
  if (!viewportBound) return;
  viewportBound = false;
  if (viewportScrollHandler) {
    for (const w of viewportWindows) {
      try {
        w.removeEventListener("scroll", viewportScrollHandler, true);
      } catch {
        /* frame gone */
      }
    }
  }
  if (viewportResizeHandler) {
    for (const w of viewportWindows) {
      try {
        w.removeEventListener("resize", viewportResizeHandler);
      } catch {
        /* frame gone */
      }
    }
    try {
      window.removeEventListener("resize", viewportResizeHandler);
    } catch {
      /* ignore */
    }
  }
  viewportScrollHandler = null;
  viewportResizeHandler = null;
  viewportWindows = [];
}

function attachViewportListeners(): void {
  detachViewportListeners();
  viewportScrollHandler = onViewportChange;
  viewportResizeHandler = onViewportChange;
  const roots = new Set<Window>([window]);
  try {
    for (const d of collectDocs(targetDocRef)) {
      if (d.defaultView) roots.add(d.defaultView);
    }
  } catch {
    /* ignore */
  }
  viewportWindows = [...roots];
  for (const w of viewportWindows) {
    try {
      w.addEventListener("scroll", viewportScrollHandler, true);
      w.addEventListener("resize", viewportResizeHandler);
    } catch {
      /* ignore */
    }
  }
  viewportBound = true;
}

function detachMutations(): void {
  mutationObserver?.disconnect();
  mutationObserver = null;
  clearReinjectTimer();
}

function attachMutations(target: Document, portalDoc: Document): void {
  detachMutations();
  mutationObserver = new MutationObserver((records) => {
    if (!active || applying) return;
    const relevant = records.some((r) => {
      const nodes = [...Array.from(r.addedNodes), ...Array.from(r.removedNodes)];
      if (!nodes.length && r.type === "attributes") return false;
      return nodes.some((n) => {
        // Cross-realm iframe nodes fail `instanceof Element` in the portal script —
        // use nodeType (same class of bug as Classic icon inject pre-1.0.7).
        if (n.nodeType === Node.TEXT_NODE) return true;
        if (n.nodeType !== Node.ELEMENT_NODE) return false;
        const el = n as Element;
        return !el.classList?.contains(AREA) && !el.classList?.contains(ICON) && el.id !== STYLE_ID;
      });
    });
    if (relevant) scheduleReinject(portalDoc);
  });
  for (const doc of collectDocs(target)) {
    if (!doc.body) continue;
    mutationObserver.observe(doc.body, { childList: true, subtree: true });
  }
}

function applyToTarget(doc: Document, opts?: { rebindFrames?: boolean }): number {
  const prev = targetDocRef;
  // Outer content root + collectDocs — covers Fluid shells that embed Classic pages
  // in nested iframes (menus / Activity Guides / nav collections).
  targetDocRef = getInspectorContentRoot(doc);
  if (prev !== targetDocRef && prev !== doc) {
    try {
      unbindTarget(prev);
    } catch {
      /* frame may be gone */
    }
  }
  bindTarget(targetDocRef);
  const n = injectIcons(targetDocRef);
  attachMutations(targetDocRef, doc);
  attachViewportListeners();
  if (opts?.rebindFrames !== false) {
    attachFrameReload(doc);
  }
  return n;
}

/** Collect portal + nested content iframes (Fluid menu → Classic page). */
function collectContentFrames(root: Document, out: HTMLIFrameElement[] = [], depth = 0): HTMLIFrameElement[] {
  if (depth > 5) return out;
  const seen = new Set(out);
  const direct = findContentFrameElement(root);
  const frames = [
    ...(direct ? [direct] : []),
    ...Array.from(
      root.querySelectorAll<HTMLIFrameElement>(
        "#ptifrmtgtframe, iframe[name='TargetContent'], .ps_target-iframe",
      ),
    ),
  ];
  for (const frame of frames) {
    if (seen.has(frame)) continue;
    seen.add(frame);
    out.push(frame);
    try {
      const child = frame.contentDocument;
      if (child?.body) collectContentFrames(child, out, depth + 1);
    } catch {
      /* cross-origin */
    }
  }
  return out;
}

function attachFrameReload(doc: Document): void {
  if (rebindingFrames) return;
  rebindingFrames = true;
  try {
    detachFrameReload();
    frameLoadHandler = () => {
      if (!active) return;
      const n = applyToTarget(doc, { rebindFrames: true });
      announce(
        doc,
        n > 0
          ? `Field inspector on — ${n} fields`
          : "Field inspector on — no fields found yet",
      );
    };
    frameLoadEls = collectContentFrames(doc);
    for (const frame of frameLoadEls) {
      try {
        frame.addEventListener("load", frameLoadHandler);
      } catch {
        /* ignore */
      }
    }
  } finally {
    rebindingFrames = false;
  }
}

function detachFrameReload(): void {
  if (frameLoadHandler) {
    for (const frame of frameLoadEls) {
      try {
        frame.removeEventListener("load", frameLoadHandler);
      } catch {
        /* frame gone */
      }
    }
  }
  frameLoadHandler = null;
  frameLoadEls = [];
}

/** Re-apply icons after bar remount / iframe navigation while inspector stays on. */
export function reinjectFieldInspector(doc: Document = document): number {
  if (!active) return 0;
  topDocRef = doc;
  return applyToTarget(doc);
}

function countCandidateFields(doc: Document): number {
  return Array.from(
    collectDocs(getInspectorContentRoot(doc)).flatMap((d) => Array.from(d.querySelectorAll(FIELD_SELECTOR))),
  ).filter((el) => isHtmlElement(el) && el.id?.includes("_")).length;
}

/** Light poll: Classic AJAX / Soft Refresh / late Fluid→Classic iframe loads can wipe icons. */
function startRecoveryPoll(doc: Document): void {
  clearPoll();
  let quiet = 0;
  pollTimer = setInterval(() => {
    if (!active) {
      clearPoll();
      return;
    }
    if (applying) return;
    const existing = Array.from(collectDocs(targetDocRef)).reduce(
      (n, d) => n + d.querySelectorAll(`.${ICON}`).length,
      0,
    );
    const fields = countCandidateFields(doc);
    if (fields > 0 && existing === 0) {
      applyToTarget(doc);
      quiet = 0;
    } else {
      quiet += 1;
      if (quiet >= 20) clearPoll();
    }
  }, 500);
}

export function startFieldInspector(doc: Document = document): void {
  if (active) return;
  active = true;
  lockedId = null;
  topDocRef = doc;
  doc.addEventListener("keydown", onKey, true);

  let n = applyToTarget(doc);

  // Classic portal / Fluid→Classic: content iframe may still be loading or mid-AJAX
  if (n === 0) {
    announce(doc, "Field inspector waiting for page content…");
    clearPoll();
    let attempts = 0;
    pollTimer = setInterval(() => {
      if (!active) {
        clearPoll();
        return;
      }
      attempts += 1;
      n = applyToTarget(doc);
      if (n > 0 || attempts >= 40) {
        clearPoll();
        announce(
          doc,
          n > 0
            ? `Field inspector on — ${n} fields. Hover icons; click to lock; Esc exits.`
            : "Field inspector on — no PeopleSoft fields found on this page.",
        );
        startRecoveryPoll(doc);
      }
    }, 250);
  } else {
    announce(
      doc,
      `Field inspector on — ${n} fields. Hover icons; click to lock; Esc exits.`,
    );
    startRecoveryPoll(doc);
  }

  const panel = doc.getElementById("mpu-recfield-name");
  if (panel) panel.hidden = false;
  setNamePanel(null);
}

export function stopFieldInspector(doc: Document = document): void {
  if (!active) return;
  active = false;
  topDocRef = doc;
  clearPoll();
  detachMutations();
  detachViewportListeners();
  const target = targetDocRef;
  doc.removeEventListener("keydown", onKey, true);
  try {
    unbindTarget(target);
  } catch {
    /* ignore */
  }
  detachFrameReload();
  try {
    removeIcons(target);
  } catch {
    /* ignore */
  }
  lockedId = null;
  peerFieldBases = [];
  const panel = doc.getElementById("mpu-recfield-name");
  if (panel) {
    panel.textContent = "";
    panel.hidden = true;
    panel.removeAttribute("title");
    panel.removeAttribute("data-mpu-empty");
  }
  announce(doc, "Field inspector off");
}

export function toggleFieldInspector(doc: Document = document): boolean {
  if (active) {
    stopFieldInspector(doc);
    return false;
  }
  startFieldInspector(doc);
  return true;
}

/** Update Inspect button + name panel without remounting the bar. */
export function syncFieldInspectorChrome(doc: Document = document): void {
  const btn = doc.getElementById("mpu-field");
  const panel = doc.getElementById("mpu-recfield-name");
  const copyBtn = doc.getElementById("mpu-copy-field") as HTMLButtonElement | null;
  const copyFmt = doc.getElementById("mpu-copy-format") as HTMLSelectElement | null;
  if (btn) {
    const on = active;
    btn.textContent = on ? "Inspect ON" : "Inspect";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (panel) {
    panel.hidden = !active;
    if (!active) {
      panel.textContent = "";
      panel.removeAttribute("title");
      panel.removeAttribute("data-mpu-empty");
    } else if (lockedId) {
      setNamePanel(lockedId);
    } else {
      setNamePanel(null);
    }
  }
  if (copyBtn) {
    copyBtn.hidden = !active || !lockedId;
  }
  if (copyFmt) {
    copyFmt.hidden = !active || !lockedId;
  }
}
