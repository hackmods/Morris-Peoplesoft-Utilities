/** Correct History then Advanced Search (Classic PSSRCHPAGE). */
(function mpuCorrAndAdv() {
  try {
    const frameEl =
      (window as unknown as { ptUtil?: { id: (id: string) => HTMLElement | null } }).ptUtil?.id(
        "ptifrmtgtframe",
      ) || document.getElementById("ptifrmtgtframe");
    const frame = frameEl as HTMLIFrameElement | null;
    const root = frame?.contentWindow?.document;
    if (!root?.body) return;
    if (!/\bPSSRCHPAGE\b/i.test(root.body.className)) return;

    const corr =
      (root.getElementsByName("PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C")[0] as HTMLElement | undefined) ||
      root.querySelector<HTMLElement>("#PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C");
    corr?.click();

    const toggle = root.getElementById("PTS_MORE_LESS_OPT");
    if (toggle?.getAttribute("aria-expanded") === "false") {
      toggle.click();
    }
  } catch {
    /* ignore */
  }
})();
