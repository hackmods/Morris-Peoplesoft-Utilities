/** Ask Classic portal to recalculate iframe layout after MPU bar mount. */
(function mpuResizeFrame() {
  try {
    const w = window as unknown as { ptIframe?: { resizeAll?: () => void } };
    w.ptIframe?.resizeAll?.();
  } catch {
    /* ignore */
  }
})();
