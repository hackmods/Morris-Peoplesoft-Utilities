import { isHtmlElement, isVisible } from "../adapters/dom";

/** Shared keyboard/focus lifecycle, including replacement and external removal. */
export function bindModalDialog(doc: Document, backdrop: HTMLElement, dialog: HTMLElement, onClose?: () => void): () => void {
  const previous = doc.activeElement;
  let closed = false;
  const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
  )).filter(isVisible).sort((a, b) => a.compareDocumentPosition(b) & 4 ? -1 : 1);
  const close = () => {
    if (closed) return;
    closed = true;
    observer.disconnect();
    doc.removeEventListener("keydown", keydown, true);
    backdrop.remove();
    onClose?.();
    if (previous && isHtmlElement(previous) && previous.isConnected && !doc.getElementById("mpu-dialog")) previous.focus();
  };
  const keydown = (event: KeyboardEvent) => {
    if (!backdrop.isConnected) { close(); return; }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key !== "Tab") return;
    const items = focusables();
    if (!items.length) { event.preventDefault(); dialog.tabIndex = -1; dialog.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (doc.activeElement === first || !dialog.contains(doc.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (doc.activeElement === last || !dialog.contains(doc.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };
  const observer = new MutationObserver(() => { if (!backdrop.isConnected) close(); });
  observer.observe(doc.body, { childList: true });
  doc.addEventListener("keydown", keydown, true);
  return close;
}
