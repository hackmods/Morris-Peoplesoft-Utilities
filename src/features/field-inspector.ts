import { announce } from "./bar";
import { getTargetDocument } from "../adapters/ps-page";

const AREA = "mpu-recfield-area";
const ICON = "mpu-recfield-icon";
const LOCKED_BORDER = "solid 2px #5DA027";
const ACTIVE_BORDER = "solid 2px #E36B22";
const ORANGE = "#E36B22";
const GREEN = "#5DA027";

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

export function fieldNameFromId(id: string): string {
  return id.split("$")[0] || id;
}

export function isFieldInspectorActive(): boolean {
  return active;
}

export function getLockedFieldName(): string | null {
  return lockedId ? fieldNameFromId(lockedId) : null;
}

/** Inline SVG avoids PeopleSoft page CSP blocking chrome-extension:// images. */
function iconDataUri(stroke: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 16 16">` +
    `<circle cx="6.5" cy="6.5" r="4" fill="none" stroke="${stroke}" stroke-width="2"/>` +
    `<path d="M9.5 9.5L14 14" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function setNamePanel(name: string): void {
  const panel = topDocRef.getElementById("mpu-recfield-name");
  if (panel) {
    panel.hidden = false;
    panel.textContent = name;
  }
}

function findFieldElement(area: Element): HTMLElement | null {
  const el = area.querySelector(FIELD_SELECTOR);
  return el instanceof HTMLElement && el.id ? el : null;
}

function clearLocks(target: Document): void {
  const orange = iconDataUri(ORANGE);
  target.querySelectorAll(`.${ICON}`).forEach((node) => {
    (node as HTMLImageElement).src = orange;
  });
  target.querySelectorAll(`.${AREA}`).forEach((node) => {
    (node as HTMLElement).style.border = ACTIVE_BORDER;
  });
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
  removeIcons(target);
  const orange = iconDataUri(ORANGE);
  let count = 0;

  for (const doc of collectDocs(target)) {
    const candidates = Array.from(doc.querySelectorAll(FIELD_SELECTOR));
    const wrappedParents = new Set<HTMLElement>();

    for (const node of candidates) {
      if (!(node instanceof HTMLElement)) continue;
      if (!node.id || !node.id.includes("_")) continue;
      const parent = node.parentElement;
      if (!parent || wrappedParents.has(parent)) continue;
      if (parent.classList.contains(AREA) || parent.querySelector(`.${AREA}`)) continue;
      if (parent.closest("#mpu-bar, #mpu-dialog, .mpu-dialog-backdrop")) continue;

      wrappedParents.add(parent);

      const area = doc.createElement("span");
      area.className = AREA;
      area.style.cssText = `border: ${ACTIVE_BORDER}; white-space: nowrap; margin: 1px; padding: 1px; display: inline-block;`;

      while (parent.firstChild) {
        area.appendChild(parent.firstChild);
      }

      const field = findFieldElement(area);
      const fieldId = field?.id ?? node.id;

      const img = doc.createElement("img");
      img.className = ICON;
      img.src = orange;
      img.width = 12;
      img.height = 12;
      img.alt = "";
      img.title = "Click to lock record.field name";
      img.dataset.mpuFieldId = fieldId;
      img.style.cssText =
        "width:12px;height:12px;padding-right:4px;vertical-align:top;cursor:pointer;";

      area.insertBefore(img, area.firstChild);
      parent.appendChild(area);
      count += 1;
    }
  }

  if (lockedId) {
    const lockedImg = target.querySelector(
      `.${ICON}[data-mpu-field-id="${CSS.escape(lockedId)}"]`,
    ) as HTMLImageElement | null;
    if (lockedImg) {
      lockedImg.src = iconDataUri(GREEN);
      if (lockedImg.parentElement) {
        (lockedImg.parentElement as HTMLElement).style.border = LOCKED_BORDER;
      }
      setNamePanel(fieldNameFromId(lockedId));
    }
  }

  return count;
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
  }
}

function onPointerOver(e: Event): void {
  if (!active || lockedId) return;
  const t = e.target as HTMLElement | null;
  const img = t?.closest?.(`.${ICON}`) as HTMLImageElement | null;
  if (!img?.dataset.mpuFieldId) return;
  setNamePanel(fieldNameFromId(img.dataset.mpuFieldId));
}

function onPointerOut(e: Event): void {
  if (!active || lockedId) return;
  const t = e.target as HTMLElement | null;
  const img = t?.closest?.(`.${ICON}`);
  if (!img) return;
  const related = (e as MouseEvent).relatedTarget as Node | null;
  if (related && img.contains(related)) return;
  setNamePanel("");
}

function onIconClick(e: MouseEvent): void {
  if (!active) return;
  const t = e.target as HTMLElement | null;
  const img = t?.closest?.(`.${ICON}`) as HTMLImageElement | null;
  if (!img?.dataset.mpuFieldId) return;
  e.preventDefault();
  e.stopPropagation();

  const fieldId = img.dataset.mpuFieldId;
  clearLocks(targetDocRef);
  lockedId = fieldId;
  img.src = iconDataUri(GREEN);
  if (img.parentElement) {
    (img.parentElement as HTMLElement).style.border = LOCKED_BORDER;
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
  return injectIcons(targetDocRef);
}

function attachFrameReload(doc: Document): void {
  detachFrameReload(doc);
  const frame = doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null;
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
  const frame = doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null;
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

  const frame = doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null;
  let n = applyToTarget(doc);

  if (n === 0 && frame) {
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
      if (n > 0 || attempts >= 25) {
        clearPoll();
        announce(
          doc,
          n > 0
            ? `Field inspector on — ${n} fields. Hover icons; click to lock; Esc exits.`
            : "Field inspector on — no PeopleSoft fields found on this page.",
        );
      }
    }, 200);
  } else {
    announce(
      doc,
      n > 0
        ? `Field inspector on — ${n} fields. Hover icons; click to lock; Esc exits.`
        : "Field inspector on — no PeopleSoft fields found on this page.",
    );
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
