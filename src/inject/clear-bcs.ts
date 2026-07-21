/**
 * Mark favorite / menu navigation so Classic breadcrumbs clear correctly
 * (parity with PS Utilities clearbcs inject).
 */
(function mpuClearBcs() {
  try {
    const w = window as unknown as {
      bcUpdater?: {
        isMenuCrefNav?: unknown;
        setStoredData?: (key: unknown, value: string) => void;
      };
      pthNav?: { isMenuCrefNav?: string };
    };
    if (typeof w.bcUpdater !== "undefined" && typeof w.pthNav !== "undefined") {
      w.bcUpdater.setStoredData?.(w.bcUpdater.isMenuCrefNav, "T");
      w.pthNav.isMenuCrefNav = "T";
    }
  } catch {
    /* ignore */
  }
})();
