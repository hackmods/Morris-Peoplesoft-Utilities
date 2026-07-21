/** Clear breadcrumbs before favorite navigation (page-context). */
(function mpuClearBcs() {
  try {
    const w = window as unknown as {
      bcUpdater?: { clearBC?: () => void };
      pthNav?: { clearBc?: () => void };
    };
    w.bcUpdater?.clearBC?.();
    w.pthNav?.clearBc?.();
  } catch {
    /* ignore */
  }
})();
