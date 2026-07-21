/** Select Correct History access mode on search pages. */
(function mpuCorrHist() {
  try {
    const frame = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement | null;
    const root = frame?.contentWindow?.document || document;
    const el =
      root.querySelector<HTMLElement>("#PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C") ||
      root.querySelector<HTMLElement>('[id*="PTS_ACCESS_MODE_C"]') ||
      root.querySelector<HTMLInputElement>('input[value="C"][name*="ACCESS_MODE"]');
    el?.click();
  } catch {
    /* ignore */
  }
})();
