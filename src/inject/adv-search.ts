/** Expand Advanced Search when collapsed (PeopleTools 8.60+ / Fluid patterns). */
(function mpuAdvSearch() {
  try {
    const doc =
      (window as unknown as { ptUtil?: { id: (id: string) => HTMLElement | null } }).ptUtil?.id(
        "ptifrmtgtframe",
      ) &&
      (
        document.getElementById("ptifrmtgtframe") as HTMLIFrameElement | null
      )?.contentWindow?.document;
    const root = doc || document;
    const toggle =
      root.querySelector<HTMLElement>('#PTS_MORE_LESS_OPT[aria-expanded="false"]') ||
      root.querySelector<HTMLElement>('[id*="PTS_MORE_LESS"][aria-expanded="false"]') ||
      root.querySelector<HTMLElement>("a#PTS_MORE_LESS_OPT");
    toggle?.click();
  } catch {
    /* ignore */
  }
})();
