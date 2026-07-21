/** Select Correct History access mode on Classic search pages. */
(function mpuCorrHist() {
  try {
    const frameEl =
      (window as unknown as { ptUtil?: { id: (id: string) => HTMLElement | null } }).ptUtil?.id(
        "ptifrmtgtframe",
      ) || document.getElementById("ptifrmtgtframe");
    const frame = frameEl as HTMLIFrameElement | null;
    const root = frame?.contentWindow?.document;
    if (!root?.body) return;
    if (!/\bPSSRCHPAGE\b/i.test(root.body.className)) return;
    const el =
      (root.getElementsByName("PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C")[0] as HTMLElement | undefined) ||
      root.querySelector<HTMLElement>("#PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C") ||
      root.querySelector<HTMLElement>('[id*="PTS_ACCESS_MODE_C"]');
    el?.click();
  } catch {
    /* ignore */
  }
})();
