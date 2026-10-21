import { afterEach, describe, expect, it, vi } from "vitest";
import { configureSidebar, getExtensionApi, openSidebar } from "../../src/platform/browser";

const chromeApi = globalThis.chrome;
afterEach(() => {
  vi.stubGlobal("browser", undefined);
  vi.stubGlobal("chrome", chromeApi);
});

describe("browser platform", () => {
  it("uses native Firefox promise APIs ahead of the chrome alias", () => {
    const native = { runtime: { id: "firefox" } };
    vi.stubGlobal("browser", native);
    expect(getExtensionApi()).toBe(native);
    vi.stubGlobal("browser", undefined);
    expect(getExtensionApi()).toBe(chromeApi);
  });

  it("reports an unavailable extension context without capturing stale globals", () => {
    vi.stubGlobal("chrome", undefined);
    expect(() => getExtensionApi()).toThrow("Extension APIs are unavailable");
    vi.stubGlobal("chrome", chromeApi);
    expect(getExtensionApi()).toBe(chromeApi);
  });

  it("configures Chrome and opens in the same synchronous user action", async () => {
    let configured = false;
    let finish!: () => void;
    const setOptions = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const open = vi.fn(async () => { expect(configured).toBe(false); });
    const setPanelBehavior = vi.fn(async () => undefined);
    vi.stubGlobal("chrome", { ...chromeApi, sidePanel: { setOptions, open, setPanelBehavior } });
    const pending = openSidebar(42, "sidepanel.html#agents");
    expect(open).toHaveBeenCalledWith({ tabId: 42 });
    expect(setOptions).toHaveBeenCalledWith({ tabId: 42, path: "sidepanel.html#agents", enabled: true });
    configured = true;
    finish();
    await pending;
    await configureSidebar();
    expect(setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: false });
  });

  it("maps Firefox's sidebar and avoids Chrome-specific APIs", async () => {
    let finish!: () => void;
    const setPanel = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const open = vi.fn(async () => undefined);
    const setPanelBehavior = vi.fn();
    vi.stubGlobal("browser", {
      runtime: { getURL: (path: string) => `moz-extension://uuid/${path}` },
      sidebarAction: { setPanel, open }, sidePanel: { setPanelBehavior },
    });
    const pending = openSidebar(7);
    expect(setPanel).toHaveBeenCalledWith({ tabId: 7, panel: "moz-extension://uuid/sidepanel.html" });
    expect(open).toHaveBeenCalledWith();
    finish();
    await pending;
    await configureSidebar();
    expect(setPanelBehavior).not.toHaveBeenCalled();
  });

  it("rejects failed opens and configuration, allowing guarded Options fallback", async () => {
    for (const stage of ["setPanel", "open"]) {
      vi.stubGlobal("browser", {
        runtime: chromeApi.runtime,
        sidebarAction: {
          setPanel: async () => { if (stage === "setPanel") throw new Error(stage); },
          open: async () => { if (stage === "open") throw new Error(stage); },
        },
      });
      await expect(openSidebar(1)).rejects.toThrow(stage);
    }
    vi.stubGlobal("browser", { runtime: chromeApi.runtime });
    await expect(openSidebar(1)).rejects.toThrow("Sidebar is unavailable");
    vi.stubGlobal("browser", { runtime: chromeApi.runtime, sidebarAction: { setPanel: () => { throw new Error("context closed"); } } });
    await expect(openSidebar(1)).rejects.toThrow("context closed");
  });
});
