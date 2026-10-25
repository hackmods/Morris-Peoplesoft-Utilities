/** DOM guards must work for elements created in same-origin child frames. */
export function isHtmlElement(el: Element): el is HTMLElement {
  return el.namespaceURI === "http://www.w3.org/1999/xhtml";
}

export function isInput(el: Element): el is HTMLInputElement {
  return isHtmlElement(el) && el.localName === "input";
}

export function isTextarea(el: Element): el is HTMLTextAreaElement {
  return isHtmlElement(el) && el.localName === "textarea";
}

export function isSelect(el: Element): el is HTMLSelectElement {
  return isHtmlElement(el) && el.localName === "select";
}

/** Include ancestor/frame visibility without assuming a viewport or layout engine. */
export function isVisible(el: Element): boolean {
  if (!el.isConnected) return false;
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node.hasAttribute("hidden") || node.hasAttribute("inert") || node.getAttribute("aria-hidden") === "true") return false;
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (style?.display === "none" || style?.visibility === "hidden" || style?.visibility === "collapse") return false;
  }
  try {
    const frame = el.ownerDocument.defaultView?.frameElement;
    if (frame) return isVisible(frame);
  } catch { return false; }
  return true;
}
