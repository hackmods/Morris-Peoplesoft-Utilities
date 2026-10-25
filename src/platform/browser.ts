/** Use Firefox's native promise APIs; retain Chrome 116 compatibility.
 * Resolve lazily so callers never capture an unavailable extension context. */
export function getExtensionApi(): typeof chrome {
  const scope = globalThis as typeof globalThis & { browser?: typeof chrome };
  const api = scope.browser ?? scope.chrome;
  if (!api?.runtime) throw new Error("Extension APIs are unavailable");
  return api;
}

export interface FirefoxSidebar {
  setPanel(options: { tabId: number; panel: string }): Promise<void>;
  open(): Promise<void>;
}

function firefoxSidebar(): FirefoxSidebar | undefined {
  return (getExtensionApi() as typeof chrome & { sidebarAction?: FirefoxSidebar }).sidebarAction;
}

/** Invoke directly in the click handler: awaiting configuration loses activation.
 * The sidebar document and its routes are shared between both browsers. */
export function openSidebar(tabId: number, path = "sidepanel.html"): Promise<void> {
  try {
    const api = getExtensionApi();
    const sidebar = firefoxSidebar();
    if (sidebar) {
      const configured = sidebar.setPanel({ tabId, panel: api.runtime.getURL(path) });
      const opened = sidebar.open();
      return Promise.all([configured, opened]).then(() => undefined);
    }
    if (!api.sidePanel?.setOptions || !api.sidePanel?.open) {
      return Promise.reject(new Error("Sidebar is unavailable"));
    }
    const configured = api.sidePanel.setOptions({ tabId, path, enabled: true });
    const opened = api.sidePanel.open({ tabId });
    return Promise.all([configured, opened]).then(() => undefined);
  } catch (error) {
    return Promise.reject(error);
  }
}

export async function configureSidebar(): Promise<void> {
  // Firefox declares its sidebar in the manifest; it has no setPanelBehavior.
  if (!firefoxSidebar()) {
    await getExtensionApi().sidePanel?.setPanelBehavior({ openPanelOnActionClick: false });
  }
}
