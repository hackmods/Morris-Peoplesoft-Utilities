import { announce } from "./bar";
import { getTargetDocument } from "../adapters/ps-page";

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
let pollTimer: ReturnType<typeof setInterval> | null = null;
let mutationObserver: MutationObserver | null = null;
let reinjectTimer: ReturnType<typeof setTimeout> | null = null;
let viewportBound = false;
let viewportScrollHandler: ((e: Event) => void) | null = null;
let viewportResizeHandler: ((e: Event) => void) | null = null;
let applying = false;
/** Base ids (no $occ) seen on the current page — used to split RECORD vs FIELD. */
let peerFieldBases: string[] = [];

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
  return {
    raw: id,
    base,
    record,
    field,
    occurrence,
    pageLabel,
    workRecord: Boolean(isWorkRecordName(record) || /^(DERIVED_|WRK_|WORK_)/i.test(base)),
    ...attrs,
  };
}

/** Clipboard / announce form — prefers RECORD.FIELD without row suffix for App Designer paste. */
export function formatRecFieldCopy(parsed: ParsedRecField): string {
  if (parsed.record && parsed.field) return `${parsed.record}.${parsed.field}`;
  return parsed.base;
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
  return formatRecFieldPlain(parseRecField(lockedId));
}

export function getLockedFieldCopyText(): string | null {
  if (!lockedId) return null;
  return formatRecFieldCopy(parseRecField(lockedId));
}

export async function copyLockedField(doc: Document = document): Promise<boolean> {
  const text = getLockedFieldCopyText();
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
    .${ICON} {
      width: 12px !important;
      height: 12px !important;
      padding-right: 4px;
      vertical-align: top;
      cursor: pointer;
      display: inline-block;
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
  return (
    node.closest(".ps_box-edit") ||
    node.closest(".ps_box-select") ||
    node.closest(".ps_box-dropdown") ||
    node.closest(".ps_box-control") ||
    node.closest("span.ps_box-value")
  );
}

/**
 * FI-05: only decorate fields near the viewport (plus locked field).
 * Margin keeps a small buffer for partial rows.
 * Zero-size rects (jsdom / not laid out) are treated as visible so Classic tests still decorate.
 */
export function isFieldInViewport(el: Element, marginPx = 200): boolean {
  const host =
    preferredFluidBoxHost(el) ||
    el.closest("tr, .ps_grid-row, .ps_box-group, .ps_box-control") ||
    el;
  const rect = host.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return true;
  }
  const view = el.ownerDocument?.defaultView || window;
  const top = -marginPx;
  const bottom = view.innerHeight + marginPx;
  const left = -marginPx;
  const right = view.innerWidth + marginPx;
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
        const parent = fluidHost?.parentElement || node.parentElement;
        if (!parent) continue;

        // Fluid: wrap only the box host. Classic: wrap all siblings under the parent (legacy).
        const hostKey = fluidHost || parent;
        if (wrappedHosts.has(hostKey)) continue;
        if (parent.classList.contains(AREA) || parent.querySelector(`:scope > .${AREA}`)) continue;
        wrappedHosts.add(hostKey);

        const area = doc.createElement("span");
        area.className = AREA;
        area.style.cssText = `border: ${ACTIVE_BORDER}; white-space: nowrap; margin: 1px; padding: 1px; display: inline-block; vertical-align: middle; box-sizing: border-box;`;

        if (fluidHost) {
          parent.insertBefore(area, fluidHost);
          area.appendChild(fluidHost);
        } else {
          while (parent.firstChild) {
            area.appendChild(parent.firstChild);
          }
          parent.appendChild(area);
        }

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
    window.removeEventListener("scroll", viewportScrollHandler, true);
  }
  if (viewportResizeHandler) {
    window.removeEventListener("resize", viewportResizeHandler);
  }
  viewportScrollHandler = null;
  viewportResizeHandler = null;
}

function attachViewportListeners(): void {
  detachViewportListeners();
  viewportScrollHandler = onViewportChange;
  viewportResizeHandler = onViewportChange;
  window.addEventListener("scroll", viewportScrollHandler, true);
  window.addEventListener("resize", viewportResizeHandler);
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
        if (!(n instanceof Element)) return n.nodeType === Node.TEXT_NODE;
        return !n.classList?.contains(AREA) && !n.classList?.contains(ICON) && n.id !== STYLE_ID;
      });
    });
    if (relevant) scheduleReinject(portalDoc);
  });
  for (const doc of collectDocs(target)) {
    if (!doc.body) continue;
    mutationObserver.observe(doc.body, { childList: true, subtree: true });
  }
}

function applyToTarget(doc: Document): number {
  const prev = targetDocRef;
  targetDocRef = getTargetDocument(doc);
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
  return n;
}

function attachFrameReload(doc: Document): void {
  detachFrameReload(doc);
  const frame =
    (doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
    (doc.querySelector('iframe[name="TargetContent"]') as HTMLIFrameElement | null);
  if (!frame) return;
  frameLoadHandler = () => {
    if (!active) return;
    const n = applyToTarget(doc);
    announce(
      doc,
      n > 0
        ? `Field inspector on — ${n} fields`
        : "Field inspector on — no fields found yet",
    );
  };
  frame.addEventListener("load", frameLoadHandler);
}

function detachFrameReload(doc: Document): void {
  if (!frameLoadHandler) return;
  const frame =
    (doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
    (doc.querySelector('iframe[name="TargetContent"]') as HTMLIFrameElement | null);
  frame?.removeEventListener("load", frameLoadHandler);
  frameLoadHandler = null;
}

/** Re-apply icons after bar remount / iframe navigation while inspector stays on. */
export function reinjectFieldInspector(doc: Document = document): number {
  if (!active) return 0;
  topDocRef = doc;
  return applyToTarget(doc);
}

export function startFieldInspector(doc: Document = document): void {
  if (active) return;
  active = true;
  lockedId = null;
  topDocRef = doc;
  doc.addEventListener("keydown", onKey, true);
  attachFrameReload(doc);

  const frame =
    (doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
    (doc.querySelector('iframe[name="TargetContent"]') as HTMLIFrameElement | null);
  let n = applyToTarget(doc);

  // Classic portal: content iframe may still be loading or mid-AJAX
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
      }
    }, 250);
  } else {
    announce(
      doc,
      n > 0
        ? `Field inspector on — ${n} fields. Hover icons; click to lock; Esc exits.`
        : "Field inspector on — no PeopleSoft fields found on this page.",
    );
  }

  // Keep a light poll while Classic iframe exists — AJAX search pages rebuild without load events
  if (frame && n > 0) {
    clearPoll();
    let quiet = 0;
    pollTimer = setInterval(() => {
      if (!active) {
        clearPoll();
        return;
      }
      if (applying) return;
      const existing = targetDocRef.querySelectorAll(`.${ICON}`).length;
      const fields = Array.from(
        collectDocs(getTargetDocument(doc)).flatMap((d) =>
          Array.from(d.querySelectorAll(FIELD_SELECTOR)),
        ),
      ).filter((el) => isHtmlElement(el) && el.id?.includes("_")).length;
      if (fields > 0 && existing === 0) {
        applyToTarget(doc);
        quiet = 0;
      } else {
        quiet += 1;
        if (quiet >= 20) clearPoll();
      }
    }, 500);
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
  detachFrameReload(doc);
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
}
