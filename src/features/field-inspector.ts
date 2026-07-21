import { announce } from "./bar";
import { getTargetDocument } from "../adapters/ps-page";

const HIGHLIGHT = "mpu-field-highlight";
const LOCKED = "mpu-field-locked";

let active = false;
let lockedEl: HTMLElement | null = null;
let tip: HTMLDivElement | null = null;

function fieldNameFromId(id: string): string {
  // PeopleSoft IDs often RECORD_FIELD$n or similar
  const cleaned = id.replace(/\$\d+$/, "").replace(/_/g, ".");
  return cleaned || id;
}

function ensureTip(doc: Document): HTMLDivElement {
  if (tip && doc.body.contains(tip)) return tip;
  tip = doc.createElement("div");
  tip.id = "mpu-field-tip";
  tip.className = "mpu-field-tip";
  tip.setAttribute("role", "status");
  tip.setAttribute("aria-live", "polite");
  doc.body.appendChild(tip);
  return tip;
}

function onMove(e: MouseEvent): void {
  if (!active) return;
  const t = e.target as HTMLElement | null;
  if (!t || t.id === "mpu-field-tip" || t.closest("#mpu-bar")) return;
  const doc = t.ownerDocument;
  doc.querySelectorAll(`.${HIGHLIGHT}`).forEach((el) => {
    if (el !== lockedEl) el.classList.remove(HIGHLIGHT);
  });
  const candidate =
    t.closest("input, select, textarea, a, span[id], div[id]") || t;
  if (!(candidate instanceof HTMLElement) || !candidate.id) return;
  if (candidate !== lockedEl) candidate.classList.add(HIGHLIGHT);
  const tipEl = ensureTip(doc);
  tipEl.textContent = fieldNameFromId(candidate.id);
  tipEl.style.left = `${e.clientX + 12}px`;
  tipEl.style.top = `${e.clientY + 12}px`;
}

function onClick(e: MouseEvent): void {
  if (!active) return;
  const t = e.target as HTMLElement | null;
  if (!t || t.closest("#mpu-bar") || t.id === "mpu-field-tip") return;
  const candidate =
    (t.closest("input, select, textarea, a, span[id], div[id]") as HTMLElement) ||
    t;
  if (!candidate.id) return;
  e.preventDefault();
  e.stopPropagation();
  const doc = candidate.ownerDocument;
  if (lockedEl) lockedEl.classList.remove(LOCKED);
  lockedEl = candidate;
  lockedEl.classList.add(LOCKED);
  lockedEl.classList.add(HIGHLIGHT);
  announce(doc, `Locked field ${fieldNameFromId(candidate.id)}`);
}

function onKey(e: KeyboardEvent): void {
  if (!active) return;
  if (e.key === "Escape") {
    e.preventDefault();
    stopFieldInspector(e.target ? (e.target as Node).ownerDocument ?? document : document);
  }
}

export function isFieldInspectorActive(): boolean {
  return active;
}

export function startFieldInspector(doc: Document = document): void {
  if (active) return;
  active = true;
  const target = getTargetDocument(doc);
  target.addEventListener("mousemove", onMove, true);
  target.addEventListener("click", onClick, true);
  doc.addEventListener("keydown", onKey, true);
  ensureTip(doc);
  announce(doc, "Field inspector on. Escape to exit.");
}

export function stopFieldInspector(doc: Document = document): void {
  if (!active) return;
  active = false;
  const target = getTargetDocument(doc);
  target.removeEventListener("mousemove", onMove, true);
  target.removeEventListener("click", onClick, true);
  doc.removeEventListener("keydown", onKey, true);
  target.querySelectorAll(`.${HIGHLIGHT}, .${LOCKED}`).forEach((el) => {
    el.classList.remove(HIGHLIGHT, LOCKED);
  });
  tip?.remove();
  tip = null;
  lockedEl = null;
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
