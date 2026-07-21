import { announce } from "./bar";
import { getTargetDocument } from "../adapters/ps-page";

const AREA = "mpu-recfield-area";
const ICON = "mpu-recfield-icon";
const LOCKED_BORDER = "solid 2px #5DA027";
const ACTIVE_BORDER = "solid 2px #E36B22";

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

export function fieldNameFromId(id: string): string {
  // Legacy shows id with $occ stripped, underscores kept (e.g. JOB_EMPLID)
  return id.split("$")[0] || id;
}

export function isFieldInspectorActive(): boolean {
  return active;
}

export function getLockedFieldName(): string | null {
  return lockedId ? fieldNameFromId(lockedId) : null;
}

function iconUrl(color: "orange" | "green" | "yellow"): string {
  return chrome.runtime.getURL(`icons/field-inspector-${color}.png`);
}

function setNamePanel(name: string): void {
  const panel = topDocRef.getElementById("mpu-recfield-name");
  if (panel) panel.textContent = name;
}

function findFieldElement(area: Element): HTMLElement | null {
  const el = area.querySelector(FIELD_SELECTOR);
  return el instanceof HTMLElement && el.id ? el : null;
}

function clearLocks(target: Document): void {
  target.querySelectorAll(`.${ICON}`).forEach((node) => {
    const img = node as HTMLImageElement;
    img.src = iconUrl("orange");
  });
  target.querySelectorAll(`.${AREA}`).forEach((node) => {
    (node as HTMLElement).style.border = ACTIVE_BORDER;
  });
}

function injectIcons(target: Document): void {
  removeIcons(target);
  const orange = iconUrl("orange");
  const candidates = Array.from(target.querySelectorAll(FIELD_SELECTOR));
  const wrappedParents = new Set<HTMLElement>();

  for (const node of candidates) {
    if (!(node instanceof HTMLElement)) continue;
    if (!node.id || !node.id.includes("_")) continue;
    const parent = node.parentElement;
    if (!parent || wrappedParents.has(parent)) continue;
    if (parent.classList.contains(AREA) || parent.querySelector(`:scope > .${AREA}`)) {
      continue;
    }
    // Skip MPU chrome
    if (parent.closest("#mpu-bar, #mpu-dialog, .mpu-dialog-backdrop")) continue;

    wrappedParents.add(parent);

    const area = target.createElement("span");
    area.className = AREA;
    area.style.cssText = `border: ${ACTIVE_BORDER}; white-space: nowrap; margin: 1px; padding: 1px; display: inline-block;`;

    while (parent.firstChild) {
      area.appendChild(parent.firstChild);
    }

    const field = findFieldElement(area);
    const fieldId = field?.id ?? node.id;

    const img = target.createElement("img");
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
  }

  if (lockedId) {
    const lockedImg = target.querySelector(
      `.${ICON}[data-mpu-field-id="${CSS.escape(lockedId)}"]`,
    ) as HTMLImageElement | null;
    if (lockedImg) {
      lockedImg.src = iconUrl("green");
      if (lockedImg.parentElement) {
        (lockedImg.parentElement as HTMLElement).style.border = LOCKED_BORDER;
      }
      setNamePanel(fieldNameFromId(lockedId));
    }
  }
}

function removeIcons(target: Document): void {
  target.querySelectorAll(`.${ICON}`).forEach((img) => img.remove());
  target.querySelectorAll(`.${AREA}`).forEach((area) => {
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
  img.src = iconUrl("green");
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
  target.addEventListener("mouseover", onPointerOver, true);
  target.addEventListener("mouseout", onPointerOut, true);
  target.addEventListener("click", onIconClick, true);
  target.addEventListener("keydown", onKey, true);
}

function unbindTarget(target: Document): void {
  target.removeEventListener("mouseover", onPointerOver, true);
  target.removeEventListener("mouseout", onPointerOut, true);
  target.removeEventListener("click", onIconClick, true);
  target.removeEventListener("keydown", onKey, true);
}

function attachFrameReload(doc: Document): void {
  detachFrameReload(doc);
  const frame = doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null;
  if (!frame) return;
  frameLoadHandler = () => {
    if (!active) return;
    targetDocRef = getTargetDocument(doc);
    bindTarget(targetDocRef);
    injectIcons(targetDocRef);
  };
  frame.addEventListener("load", frameLoadHandler);
}

function detachFrameReload(doc: Document): void {
  if (!frameLoadHandler) return;
  const frame = doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null;
  frame?.removeEventListener("load", frameLoadHandler);
  frameLoadHandler = null;
}

export function startFieldInspector(doc: Document = document): void {
  if (active) return;
  active = true;
  lockedId = null;
  topDocRef = doc;
  targetDocRef = getTargetDocument(doc);
  doc.addEventListener("keydown", onKey, true);
  bindTarget(targetDocRef);
  injectIcons(targetDocRef);
  attachFrameReload(doc);
  setNamePanel("");
  announce(doc, "Field inspector on. Hover icons; click to lock; Escape to exit.");
}

export function stopFieldInspector(doc: Document = document): void {
  if (!active) return;
  active = false;
  topDocRef = doc;
  const target = targetDocRef;
  doc.removeEventListener("keydown", onKey, true);
  unbindTarget(target);
  detachFrameReload(doc);
  removeIcons(target);
  lockedId = null;
  setNamePanel("");
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
