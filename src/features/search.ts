import type { MpuSettings } from "../storage/schema";
import { isYes } from "../storage/schema";
import { isHtmlElement, isInput, isVisible } from "../adapters/dom";

// Document lifetime, rather than retry lifetime: AJAX replacements must not replay actions.
const attempted = new WeakMap<Document, Set<string>>();
const clicking = new WeakSet<Document>();
let retries: number[] = [];
let generation = 0;

function searchDocument(): Document | null {
  try {
    const frame = document.querySelector<HTMLIFrameElement>('#ptifrmtgtframe, iframe[name="TargetContent"]');
    // Never fall back to clicking the collection shell while its target is loading/inaccessible.
    if (frame) return frame.contentDocument?.body ? frame.contentDocument : null;
    const target = (window as Window & { TargetContent?: Window }).TargetContent;
    if (target) return target.document?.body ? target.document : null;
    return document;
  } catch { return null; }
}

function searchRoot(doc: Document): HTMLElement | null {
  if (doc.body?.classList.contains("PSSRCHPAGE")) return doc.body;
  // A global search box, search results, or an access-mode substring is insufficient evidence.
  const roots = [...doc.querySelectorAll<HTMLElement>("#ptsrchpage, #PTS_SEARCH")]
    .filter((el) => ["div", "section", "form"].includes(el.localName) && isVisible(el));
  return roots.length === 1 ? roots[0] : null;
}

function usable(el: Element): el is HTMLElement {
  return isHtmlElement(el) && isVisible(el) && !el.matches(":disabled") && el.getAttribute("aria-disabled") !== "true";
}

function applySearchOptions(settings: MpuSettings): void {
  const doc = searchDocument();
  if (!doc) return;
  const root = searchRoot(doc);
  if (!root || !isVisible(root)) return;
  let actions = attempted.get(doc);
  if (!actions) {
    actions = new Set();
    attempted.set(doc, actions);
    const stopAfterEdit = (event: Event) => {
      if (!event.isTrusted || clicking.has(doc)) return;
      actions!.add("correct-history");
      actions!.add("advanced-search");
    };
    doc.addEventListener("input", stopAfterEdit, true);
    doc.addEventListener("change", stopAfterEdit, true);
  }
  const clickOnce = (el: HTMLElement, key: string): void => {
    actions!.add(key); // Mark before page code runs, including synchronous re-entry or failure.
    clicking.add(doc);
    try { el.click(); } finally { clicking.delete(doc); }
  };
  if (isYes(settings.features.correctHistoryOption) && !actions.has("correct-history")) {
    const controls = root.querySelectorAll('[id="PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C"], [name="PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C"]');
    if (controls.length === 1) {
      const control = controls[0];
      if (usable(control)) {
        if (isInput(control) && ["radio", "checkbox"].includes(control.type)) {
          if (!control.checked) { clickOnce(control, "correct-history"); return; }
          actions.add("correct-history");
        } else if (control.getAttribute("role") === "radio" && control.getAttribute("aria-checked") === "false") {
          clickOnce(control, "correct-history"); return;
        } else if (control.getAttribute("role") === "radio" && control.getAttribute("aria-checked") === "true") {
          actions.add("correct-history");
        }
      }
    }
  }
  if (isYes(settings.features.advSearchOption) && !actions.has("advanced-search")) {
    const controls = root.querySelectorAll('[id="PTS_MORE_LESS_OPT"]');
    if (controls.length !== 1) return;
    const control = controls[0];
    if (control.getAttribute("aria-expanded") === "true") { actions.add("advanced-search"); return; }
    // Unknown state means leave it alone. Never click arbitrary More/Expand links.
    if (usable(control) && control.matches('a, button, input[type="button"], [role="button"]')
      && control.getAttribute("aria-expanded") === "false") clickOnce(control, "advanced-search");
  }
}

export function stopSearchOptions(): void {
  generation++;
  retries.forEach((id) => window.clearTimeout(id));
  retries = [];
}

/** DOM clicks invoke the owning page handlers without an uncancellable injected script. */
export function runSearchOptions(settings: MpuSettings): void {
  stopSearchOptions();
  if (!isYes(settings.features.correctHistoryOption) && !isYes(settings.features.advSearchOption)) return;
  const run = generation;
  const apply = () => { if (run === generation) applySearchOptions(settings); };
  apply();
  retries = [400, 1200].map((delay) => window.setTimeout(apply, delay));
}
