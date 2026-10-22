import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultSettings } from "@/storage/schema";
import { resetChromeStorage } from "../setup/chrome-mock";
import { mountBar, removeBar } from "@/features/bar";
import { parsePsUrl } from "@/adapters/ps-page";

const url = "https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL";
const sender = { id: "mpu-test", frameId: 0, url, tab: { id: 7, url } } as chrome.runtime.MessageSender;
const setOptions = vi.fn(async () => undefined);
const open = vi.fn<() => Promise<void>>(async () => undefined);
const create = vi.fn(async () => ({}));
const get = vi.fn(async () => ({ id: 7, url }));
const changed = vi.fn();

async function start() {
  await import("@/background/service-worker");
  await vi.waitFor(() => expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 0));
  return vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)![0];
}

describe("Agents library opening", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    open.mockResolvedValue(undefined);
    get.mockResolvedValue({ id: 7, url });
    resetChromeStorage({ mpuSettings: createDefaultSettings() });
    Object.assign(chrome.storage, { onChanged: { addListener: changed } });
    Object.assign(chrome, { sidePanel: { setOptions, open } });
    Object.assign(chrome.tabs, { create, get });
  });

  function mount(loginMode = false): void {
    document.body.innerHTML = '<div id="PT_HEADER"></div>';
    const settings = createDefaultSettings();
    mountBar({ settings, parsed: parsePsUrl(url), envLabel: "DEV", loginMode,
      fieldInspectorActive: false, traceRunning: false, traceLocked: false,
      traceSettings: settings.traceSettings, onTraceToggle: vi.fn(), onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(), onNewWindow: vi.fn(), onAddFavorite: vi.fn() });
  }

  it("sends only the route request from the labeled toolbar button", () => {
    mount();
    const button = document.getElementById("mpu-agents")!;
    expect(button.textContent).toBe("Agents");
    button.click();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "mpu-open-agents" });
  });

  it("ignores a stale button after removal and omits Agents on login", () => {
    mount();
    const button = document.getElementById("mpu-agents")!;
    removeBar(document);
    button.click();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    mount(true);
    expect(document.getElementById("mpu-agents")).toBeNull();
  });

  it("routes a trusted bar click to the local panel without awaiting configuration", async () => {
    const receive = await start();
    const respond = vi.fn();
    receive({ type: "mpu-open-agents" }, sender, respond);
    expect(setOptions).toHaveBeenCalledWith({ tabId: 7, path: "sidepanel.html#agents", enabled: true });
    expect(open).toHaveBeenCalledWith({ tabId: 7 });
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: true, destination: "sidepanel" }));
  });

  it("rejects foreign senders and child frames", async () => {
    const receive = await start();
    receive({ type: "mpu-open-agents" }, { ...sender, id: "other" }, vi.fn());
    receive({ type: "mpu-open-agents" }, { ...sender, frameId: 2 }, vi.fn());
    expect(open).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("fails closed for a restricted host", async () => {
    const settings = createDefaultSettings();
    settings.features.hostAllowlistEnabled = "Yes";
    settings.hostAllowlist = [];
    resetChromeStorage({ mpuSettings: settings });
    const receive = await start();
    receive({ type: "mpu-open-agents" }, sender, vi.fn());
    expect(open).not.toHaveBeenCalled();
  });

  it("falls back to the local Options library when panel open fails", async () => {
    open.mockRejectedValue(new Error("No activation"));
    const receive = await start();
    receive({ type: "mpu-open-agents" }, sender, vi.fn());
    await vi.waitFor(() => expect(create).toHaveBeenCalledWith({ url: "chrome-extension://mpu-test/options.html#agents" }));
  });

  it("rejects a mapped environment that is unavailable or inactive", async () => {
    const settings = createDefaultSettings();
    settings.urlSites["https://hr.example.edu"] = { ps: { envId: 99 } };
    resetChromeStorage({ mpuSettings: settings });
    const receive = await start();
    receive({ type: "mpu-open-agents" }, sender, vi.fn());
    expect(open).not.toHaveBeenCalled();
  });

  it("cancels fallback when settings change while open is pending", async () => {
    let rejectOpen!: (reason: Error) => void;
    open.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectOpen = reject; }));
    const receive = await start();
    const respond = vi.fn();
    receive({ type: "mpu-open-agents" }, sender, respond);
    changed.mock.calls[0][0]({ mpuSettings: { newValue: {} } }, "local");
    rejectOpen(new Error("No activation"));
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false }));
    expect(create).not.toHaveBeenCalled();
  });

  it("does not perform a late fallback after the tab navigates", async () => {
    open.mockRejectedValue(new Error("No activation"));
    get.mockResolvedValue({ id: 7, url: "https://other.example/" });
    const receive = await start();
    const respond = vi.fn();
    receive({ type: "mpu-open-agents" }, sender, respond);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false }));
    expect(create).not.toHaveBeenCalled();
  });

  it.each(["scheduler", "ib"])("opens the fixed empty %s route for a trusted Page Info sender", async (route) => {
    const receive = await start(); const respond = vi.fn();
    receive({ type: `mpu-open-${route}`, url: "https://untrusted.invalid/", text: "must not be passed" }, sender, respond);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: true }));
    expect(create).toHaveBeenCalledWith({ url: `chrome-extension://mpu-test/options.html#${route}` });
    expect(open).not.toHaveBeenCalled();
  });

  it.each(["scheduler", "ib"])("rejects %s routing for foreign/frame senders, disabled Page Info, blocked hosts and inactive environments", async (route) => {
    for (const restriction of ["foreign", "frame", "feature", "host", "environment"]) {
      vi.resetModules(); vi.clearAllMocks(); const settings = createDefaultSettings();
      if (restriction === "feature") settings.features.pageInfoOption = "No";
      if (restriction === "host") { settings.features.hostAllowlistEnabled = "Yes"; settings.hostAllowlist = []; }
      if (restriction === "environment") settings.urlSites["https://hr.example.edu"] = { ps: { envId: 99 } };
      resetChromeStorage({ mpuSettings: settings }); const receive = await start(); const respond = vi.fn();
      receive({ type: `mpu-open-${route}` }, { ...sender, ...(restriction === "foreign" ? { id: "other" } : {}), ...(restriction === "frame" ? { frameId: 1 } : {}) }, respond);
      await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false })); expect(create).not.toHaveBeenCalled();
    }
  });

  it.each(["scheduler", "ib"])("cancels pending %s routing after navigation or settings changes", async (route) => {
    const receive = await start(); const respond = vi.fn();
    get.mockResolvedValueOnce({ id: 7, url: "https://other.example/" });
    receive({ type: `mpu-open-${route}` }, sender, respond);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false })); expect(create).not.toHaveBeenCalled();
    let finish!: (tab: { id: number; url: string }) => void;
    get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); respond.mockClear();
    receive({ type: `mpu-open-${route}` }, sender, respond); await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    changed.mock.calls[0][0]({ mpuSettings: { newValue: {} } }, "local"); finish({ id: 7, url });
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false })); expect(create).not.toHaveBeenCalled();
  });

  it("opens only fixed reference destinations with bounded version context", async () => {
    const receive = await start();
    for (const [source, destination] of [["help", "docs"], ["pcode", "docs"], ["pcode", "agents"]]) {
      const respond = vi.fn();
      receive({ type: "mpu-open-reference", source, destination, tools: "8.62.06", uiMode: "fluid", url: "https://untrusted.invalid/", text: "PRIVATE-CANARY" }, sender, respond);
      await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: true }));
      expect(create).toHaveBeenLastCalledWith({ url: `chrome-extension://mpu-test/options.html${destination === "docs" ? "?tools=8.62.06" : ""}#${destination}` });
    }
  });

  it("rejects malformed, revoked and stale reference routes", async () => {
    const receive = await start();
    const message = { type: "mpu-open-reference", source: "pcode", destination: "docs", tools: "", uiMode: "fluid" };
    for (const changes of [{ source: "other" }, { destination: "https://untrusted.invalid" }, { tools: "PRIVATE-TOKEN" }, { uiMode: "other" }]) {
      const respond = vi.fn(); receive({ ...message, ...changes }, sender, respond);
      await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false }));
    }
    for (const untrusted of [{ ...sender, id: "other" }, { ...sender, frameId: 1 }]) {
      const respond = vi.fn(); receive(message, untrusted, respond);
      await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false }));
    }
    get.mockResolvedValueOnce({ id: 7, url: "https://other.example/" });
    const respond = vi.fn(); receive(message, sender, respond);
    await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false }));
    let finish!: (tab: { id: number; url: string }) => void;
    get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); respond.mockClear();
    receive(message, sender, respond); await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    const settings = createDefaultSettings(); settings.features.pageInfoOption = "No"; settings.features.recFieldInfoOption = "No";
    resetChromeStorage({ mpuSettings: settings }); changed.mock.calls[0][0]({ mpuSettings: { newValue: settings } }, "local");
    finish({ id: 7, url }); await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false }));
    expect(create).not.toHaveBeenCalled();
  });

  it("honors inspector UI scope and host restrictions for reference routes", async () => {
    for (const restriction of ["scope", "host", "environment"]) {
      vi.resetModules(); vi.clearAllMocks(); const settings = createDefaultSettings();
      settings.features.pageInfoOption = "No"; settings.features.recFieldInfoOption = "Yes";
      if (restriction === "scope") settings.featureUiScopes.recFieldInfoOption = "classic";
      if (restriction === "host") { settings.features.hostAllowlistEnabled = "Yes"; settings.hostAllowlist = []; }
      if (restriction === "environment") settings.urlSites["https://hr.example.edu"] = { ps: { envId: 99 } };
      resetChromeStorage({ mpuSettings: settings }); const receive = await start(); const respond = vi.fn();
      receive({ type: "mpu-open-reference", source: "pcode", destination: "agents", tools: "", uiMode: "fluid" }, sender, respond);
      await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ ok: false })); expect(create).not.toHaveBeenCalled();
    }
  });
});
