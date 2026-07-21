import { describe, expect, it, vi, beforeEach } from "vitest";
import { mountBar, removeBar, announce, showPageInfoDialog } from "@/features/bar";
import { createDefaultSettings } from "@/storage/schema";
import type { ParsedPsUrl } from "@/adapters/ps-page";

const parsed: ParsedPsUrl = {
  href: "https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL",
  baseURL: "https://hr.example.edu",
  origin: "https://hr.example.edu",
  servlet: "psp",
  site: "ps",
  siteNormalized: "ps",
  portal: "EMPLOYEE",
  node: "HRMS",
  kind: "component",
  menu: "MENU",
  component: "COMP",
  market: "GBL",
};

describe("utilities bar", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="PT_HEADER"></div>`;
  });

  it("mounts accessible toolbar with brand and actions", () => {
    const settings = createDefaultSettings();
    const onPageInfo = vi.fn();
    mountBar({
      settings,
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      onTraceToggle: vi.fn(),
      onPageInfo,
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });

    const bar = document.getElementById("mpu-bar");
    expect(bar?.getAttribute("role")).toBe("toolbar");
    expect(bar?.getAttribute("aria-label")).toBe("Morris PeopleSoft Utilities");
    expect(document.querySelector(".mpu-env")?.textContent).toBe("DEV");
    expect(document.getElementById("mpu-live")?.getAttribute("aria-live")).toBe("polite");

    document.getElementById("mpu-pageinfo")?.click();
    expect(onPageInfo).toHaveBeenCalledOnce();
  });

  it("hides disabled features", () => {
    const settings = createDefaultSettings();
    settings.features.traceOption = "No";
    settings.features.recFieldInfoOption = "No";
    settings.features.shortcutsOption = "No";
    mountBar({
      settings,
      parsed,
      envLabel: "QA",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    expect(document.getElementById("mpu-trace")).toBeNull();
    expect(document.getElementById("mpu-field")).toBeNull();
    expect(document.getElementById("mpu-fav")).toBeNull();
  });

  it("shows locked trace state", () => {
    const settings = createDefaultSettings();
    settings.features.traceOption = "Yes";
    mountBar({
      settings,
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: true,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    const trace = document.getElementById("mpu-trace") as HTMLButtonElement;
    expect(trace.disabled).toBe(true);
    expect(trace.textContent).toContain("🔒");
  });

  it("removeBar clears chrome", () => {
    mountBar({
      settings: createDefaultSettings(),
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    removeBar();
    expect(document.getElementById("mpu-bar")).toBeNull();
    expect(document.getElementById("mpu-live")).toBeNull();
  });

  it("announce writes to live region", () => {
    mountBar({
      settings: createDefaultSettings(),
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    announce(document, "Hello analysts");
    expect(document.getElementById("mpu-live")?.textContent).toBe("Hello analysts");
  });

  it("page info dialog exposes copy and close", async () => {
    document.documentElement.innerHTML = `
      <body>
        <div id="PT_HEADER"></div>
        <!-- User=BA1; ToolsRel=8.60; AppServ=//x -->
        <div id="pt_pageinfo" menu="M" component="C" page="P"></div>
      </body>`;
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    showPageInfoDialog(document, parsed);
    expect(document.getElementById("mpu-dialog")).toBeTruthy();
    expect(document.getElementById("mpu-pi-body")?.textContent).toContain("Menu:");

    document.getElementById("mpu-pi-copy")?.dispatchEvent(new Event("click"));
    await Promise.resolve();
    expect(writeText).toHaveBeenCalled();

    document.getElementById("mpu-pi-close")?.click();
    expect(document.getElementById("mpu-dialog")).toBeNull();
  });
});
