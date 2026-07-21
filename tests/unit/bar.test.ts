import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mountBar,
  removeBar,
  announce,
  showPageInfoDialog,
  groupFavoritesByCategory,
} from "@/features/bar";
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

  it("groups favorites by category for optgroups", () => {
    const groups = groupFavoritesByCategory([
      {
        Servlet: "psp",
        Menu: "A",
        Component: "C1",
        Market: "GBL",
        Parameters: "",
        Category: "HR",
        SubCategory: "",
        Description: "One",
      },
      {
        Servlet: "psp",
        Menu: "B",
        Component: "C2",
        Market: "GBL",
        Parameters: "",
        Category: "",
        SubCategory: "",
        Description: "Two",
      },
      {
        Servlet: "psp",
        Menu: "A",
        Component: "C3",
        Market: "GBL",
        Parameters: "",
        Category: "HR",
        SubCategory: "Payroll",
        Description: "Three",
      },
    ]);
    expect(groups.map((g) => g.category)).toEqual(["HR", "Uncategorized"]);
    expect(groups[0]?.entries).toHaveLength(2);
  });

  it("page info dialog exposes copy, markdown copy, and richer meta", async () => {
    document.documentElement.innerHTML = `
      <body>
        <div id="PT_HEADER"></div>
        <!-- User=BA1; ToolsRel=8.60; AppServ=//x; DBName=CSDEV; DBType=MICROSOFT; AppsRel=9.20 -->
        <div id="pt_pageinfo" menu="M" component="C" page="P"></div>
      </body>`;
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    showPageInfoDialog(document, parsed, "NC_REHIRE_ELIG.TO_DATE (row 0)");
    expect(document.getElementById("mpu-dialog")).toBeTruthy();
    const body = document.getElementById("mpu-pi-body")?.textContent || "";
    expect(body).toContain("Menu:");
    expect(body).toContain("ToolsRel: 8.60");
    expect(body).toContain("User: BA1");
    expect(body).toContain("DB Name: CSDEV");
    expect(body).toContain("Mode:");
    expect(body).toContain("Portal: EMPLOYEE");
    expect(body).toContain("Locked field: NC_REHIRE_ELIG.TO_DATE (row 0)");

    document.getElementById("mpu-pi-copy")?.dispatchEvent(new Event("click"));
    await Promise.resolve();
    expect(writeText).toHaveBeenCalled();

    document.getElementById("mpu-pi-copy-md")?.dispatchEvent(new Event("click"));
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("### PeopleSoft page info"));

    document.getElementById("mpu-pi-close")?.click();
    expect(document.getElementById("mpu-dialog")).toBeNull();
  });

  it("mounts UI mode badge and favorites filter", () => {
    const settings = createDefaultSettings();
    settings.favorites = [
      {
        Servlet: "psp",
        Menu: "M",
        Component: "C",
        Market: "GBL",
        Parameters: "",
        Category: "Campus",
        SubCategory: "",
        Description: "Rehire",
      },
    ];
    mountBar({
      settings,
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
    expect(document.getElementById("mpu-ui-mode")?.textContent).toBeTruthy();
    expect(document.getElementById("mpu-fav-filter")).toBeTruthy();
    expect(document.querySelector("#mpu-fav-select optgroup")?.getAttribute("label")).toBe("Campus");
  });
});
