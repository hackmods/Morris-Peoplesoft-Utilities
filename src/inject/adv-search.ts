/** Expand Advanced Search when collapsed (Classic PSSRCHPAGE / Fluid patterns). */
(function mpuAdvSearch() {
  try {
    const frameEl =
      (window as unknown as { ptUtil?: { id: (id: string) => HTMLElement | null } }).ptUtil?.id(
        "ptifrmtgtframe",
      ) || document.getElementById("ptifrmtgtframe");
    const frame = frameEl as HTMLIFrameElement | null;
    const root = frame?.contentWindow?.document;
    if (!root?.body) return;
    if (!/\bPSSRCHPAGE\b/i.test(root.body.className) && !root.querySelector("#PTS_MORE_LESS_OPT")) {
      return;
    }
    const toggle = root.getElementById("PTS_MORE_LESS_OPT");
    if (toggle?.getAttribute("aria-expanded") === "false") {
      toggle.click();
    }
  } catch {
    /* ignore */
  }
})();
