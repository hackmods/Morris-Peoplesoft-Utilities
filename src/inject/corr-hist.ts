/** Select Correct History access mode on Classic / Fluid-ish search pages. */
(function mpuCorrHist() {
  function resolveRoot(): Document | null {
    try {
      const named = (window as Window & { TargetContent?: Window }).TargetContent;
      if (named?.document?.body) return named.document;
    } catch {
      /* ignore */
    }
    try {
      const frame =
        (document.getElementById("ptifrmtgtframe") as HTMLIFrameElement | null) ||
        (document.querySelector('iframe[name="TargetContent"]') as HTMLIFrameElement | null);
      if (frame?.contentDocument?.body) return frame.contentDocument;
    } catch {
      /* ignore */
    }
    return document.body ? document : null;
  }

  function isSearchPage(root: Document): boolean {
    const body = root.body;
    if (!body) return false;
    if (/\bPSSRCHPAGE\b/i.test(body.className || "")) return true;
    if (root.querySelector('[id*="PTS_ACCESS_MODE"], [name*="PTS_ACCESS_MODE"]')) return true;
    if (root.getElementById("PTS_MORE_LESS_OPT")) return true;
    if (root.querySelector(".ps_box-search, #ptsrchpage, .PSSRCHRESULTS, #PTS_SEARCH")) return true;
    return false;
  }

  try {
    const root = resolveRoot();
    if (!root || !isSearchPage(root)) return;
    const el =
      (root.getElementsByName("PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C")[0] as HTMLElement | undefined) ||
      root.querySelector<HTMLElement>("#PTS_CFG_CL_WRK_PTS_ACCESS_MODE_C") ||
      root.querySelector<HTMLElement>('[id*="PTS_ACCESS_MODE_C"]') ||
      root.querySelector<HTMLElement>('[name*="PTS_ACCESS_MODE_C"]') ||
      root.querySelector<HTMLElement>('input[value="C"][id*="ACCESS_MODE"], input[value="C"][name*="ACCESS_MODE"]');
    el?.click();
  } catch {
    /* ignore */
  }
})();
