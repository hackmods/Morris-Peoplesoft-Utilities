/** Correct History then Advanced Search. */
(function mpuCorrAndAdv() {
  try {
    const frame = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement | null;
    const root = frame?.contentWindow?.document || document;
    const corr =
      root.querySelector<HTMLElement>("#PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C") ||
      root.querySelector<HTMLElement>('[id*="PTS_ACCESS_MODE_C"]');
    corr?.click();
    const toggle =
      root.querySelector<HTMLElement>('#PTS_MORE_LESS_OPT[aria-expanded="false"]') ||
      root.querySelector<HTMLElement>("a#PTS_MORE_LESS_OPT");
    toggle?.click();
  } catch {
    /* ignore */
  }
})();
