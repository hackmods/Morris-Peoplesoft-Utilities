import { announce } from "./bar";
import { getTargetDocument } from "../adapters/ps-page";

const AREA = "mpu-recfield-area";
const ICON = "mpu-recfield-icon";
const LOCKED_BORDER = "solid 2px #5DA027";
const ACTIVE_BORDER = "solid 2px #E36B22";
const ORANGE = "#E36B22";
const GREEN = "#5DA027";
const STYLE_ID = "mpu-field-inspector-style";

/** Match Classic PeopleSoft field hosts (parity with PS Utilities). */
const FIELD_SELECTOR = [
  "input:not([type=hidden])",
  "select",
  "textarea",
  "span.PSEDITBOX_DISPONLY",
  "span.PSDROPDOWNLIST_DISPONLY",
  "span.PALEVEL0PRIMARY",
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
let applying = false;

export function fieldNameFromId(id: string): string {
  return id.split("$")[0] || id;
}

export function isFieldInspectorActive(): boolean {
  return active;
}

export function getLockedFieldName(): string | null {
  return lockedId ? fieldNameFromId(lockedId) : null;
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

function setNamePanel(name: string): void {
  const panel = topDocRef.getElementById("mpu-recfield-name");
  if (panel) {
    panel.hidden = false;
    panel.textContent = name;
  }
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

function injectIcons(target: Document): number {
  applying = true;
  try {
    removeIcons(target);
    let count = 0;

    for (const doc of collectDocs(target)) {
      ensureTargetStyles(doc);
      const candidates = Array.from(doc.querySelectorAll(FIELD_SELECTOR));
      const wrappedParents = new Set<Element>();

      for (const node of candidates) {
        if (!isHtmlElement(node)) continue;
        if (!node.id || !node.id.includes("_")) continue;
        const parent = node.parentElement;
        if (!parent || wrappedParents.has(parent)) continue;
        if (parent.classList.contains(AREA) || parent.querySelector(`.${AREA}`)) continue;
        if (parent.closest("#mpu-bar, #mpu-dialog, .mpu-dialog-backdrop, #psutil")) continue;

        wrappedParents.add(parent);

        const area = doc.createElement("span");
        area.className = AREA;
        area.style.cssText = `border: ${ACTIVE_BORDER}; white-space: nowrap; margin: 1px; padding: 1px; display: inline-block; vertical-align: middle; box-sizing: border-box;`;

        while (parent.firstChild) {
          area.appendChild(parent.firstChild);
        }

        const field = findFieldElement(area);
        const fieldId = field?.id ?? node.id;

        const icon = createIcon(doc, ORANGE, fieldId);
        area.insertBefore(icon, area.firstChild);
        parent.appendChild(area);
        count += 1;
      }
    }

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
          setNamePanel(fieldNameFromId(lockedId));
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
  setNamePanel(fieldNameFromId(fieldId));
}

function onPointerOut(e: Event): void {
  if (!active || lockedId) return;
  const t = e.target as Element | null;
  const icon = t?.closest?.(`.${ICON}`);
  if (!icon) return;
  const related = (e as MouseEvent).relatedTarget as Node | null;
  if (related && icon.contains(related)) return;
  setNamePanel("");
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
  const name = fieldNameFromId(fieldId);
  setNamePanel(name);
  announce(topDocRef, `Locked field ${name}`);
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
  }, 150);
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
  setNamePanel("");
}

export function stopFieldInspector(doc: Document = document): void {
  if (!active) return;
  active = false;
  topDocRef = doc;
  clearPoll();
  detachMutations();
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
  const panel = doc.getElementById("mpu-recfield-name");
  if (panel) {
    panel.textContent = "";
    panel.hidden = true;
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
  if (btn) {
    const on = active;
    btn.textContent = on ? "Inspect ON" : "Inspect";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (panel) {
    panel.hidden = !active;
    if (!active) panel.textContent = "";
    else if (lockedId) panel.textContent = fieldNameFromId(lockedId);
  }
}
