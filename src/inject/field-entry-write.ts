/**
 * Soft-notify Classic PeopleSoft that field values changed after MPU Field Entry apply.
 * Runs in page context so delivered helpers (addchg_ / doChange_) are reachable when present.
 * Never auto-submits the page.
 */
(function mpuFieldEntryWrite() {
  type WinHooks = Window & {
    addchg_?: (el: Element) => void;
    doChange_?: (el: Element) => void;
    addchange_?: (el: Element) => void;
  };

  try {
    const root = document;
    if (!root) return;
    const win = (root.defaultView || window) as WinHooks;
    const marked = root.querySelectorAll("[data-mpu-fe-written='1']");
    const candidates =
      marked.length > 0
        ? Array.from(marked)
        : Array.from(
            root.querySelectorAll(
              "input:not([type=hidden]):not([type=password]), select, textarea",
            ),
          ).slice(0, 0); // no-op fallback — only touch explicitly written fields

    for (const el of candidates) {
      if (!(el instanceof HTMLElement)) continue;
      try {
        if (typeof win.addchg_ === "function") {
          win.addchg_(el);
        } else if (typeof win.addchange_ === "function") {
          win.addchange_(el);
        } else if (typeof win.doChange_ === "function") {
          win.doChange_(el);
        }
      } catch {
        /* soft-fail per field */
      }
    }
  } catch {
    /* ignore */
  }
})();
