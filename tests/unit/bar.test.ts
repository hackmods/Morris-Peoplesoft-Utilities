import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  mountBar,
  removeBar,
  announce,
  showPageInfoDialog,
  showGoToComponentDialog,
  showPageTabsDialog,
  groupFavoritesByCategory,
} from "@/features/bar";
import { buildFavoriteTree, showAddFavoriteDialog } from "@/features/favorites-ui";
import { createDefaultSettings } from "@/storage/schema";
import { applyTracePreset } from "@/features/trace-presets";
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
      traceSettings: createDefaultSettings().traceSettings,
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

  it("mounts wave 6 PCode, Structure, and Admin buttons when page info is on", () => {
    const settings = createDefaultSettings();
    mountBar({
      settings,
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      traceSettings: createDefaultSettings().traceSettings,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    expect(document.getElementById("mpu-pcode")).toBeTruthy();
    expect(document.getElementById("mpu-structure")).toBeTruthy();
    expect(document.getElementById("mpu-admin")).toBeTruthy();
  });

  it("hides wave 6 buttons when page info and inspect are off", () => {
    const settings = createDefaultSettings();
    settings.features.pageInfoOption = "No";
    settings.features.recFieldInfoOption = "No";
    mountBar({
      settings,
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      traceSettings: createDefaultSettings().traceSettings,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    expect(document.getElementById("mpu-pcode")).toBeNull();
    expect(document.getElementById("mpu-structure")).toBeNull();
    expect(document.getElementById("mpu-admin")).toBeNull();
  });

  it("shows PCode when only field inspector is enabled", () => {
    const settings = createDefaultSettings();
    settings.features.pageInfoOption = "No";
    settings.features.recFieldInfoOption = "Yes";
    mountBar({
      settings,
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      traceSettings: createDefaultSettings().traceSettings,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    expect(document.getElementById("mpu-pcode")).toBeTruthy();
    expect(document.getElementById("mpu-structure")).toBeNull();
    expect(document.getElementById("mpu-admin")).toBeNull();
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
      traceSettings: createDefaultSettings().traceSettings,
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
      traceSettings: createDefaultSettings().traceSettings,
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

  it("shows trace preset hint on bar when flags configured (TR-04)", () => {
    const settings = createDefaultSettings();
    settings.features.traceOption = "Yes";
    settings.traceSettings = applyTracePreset("sql");
    mountBar({
      settings,
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: true,
      traceLocked: false,
      traceSettings: settings.traceSettings,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    const trace = document.getElementById("mpu-trace");
    expect(trace?.textContent).toContain("Trace ON");
    expect(trace?.textContent).toContain("SQL");
  });

  it("removeBar clears chrome", () => {
    mountBar({
      settings: createDefaultSettings(),
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      traceSettings: createDefaultSettings().traceSettings,
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
      traceSettings: createDefaultSettings().traceSettings,
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

    const readText = vi.fn(async () => "Menu: OTHER\nComponent: C\nToolsRel: 8.50");
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText, readText },
    });
    document.getElementById("mpu-pi-compare")?.dispatchEvent(new Event("click"));
    await Promise.resolve();
    await Promise.resolve();
    expect(document.getElementById("mpu-pi-diff")?.hidden).toBe(false);
    expect(document.getElementById("mpu-pi-diff")?.textContent).toContain("≠");

    document.getElementById("mpu-pi-close")?.click();
    expect(document.getElementById("mpu-dialog")).toBeNull();
  });

  it("page info dialog closes on Escape", () => {
    document.body.innerHTML = `<div id="PT_HEADER"></div>`;
    showPageInfoDialog(document, parsed);
    expect(document.getElementById("mpu-dialog")).toBeTruthy();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.getElementById("mpu-dialog")).toBeNull();
  });

  it("mounts UI mode badge and shortcuts flyout", () => {
    const settings = createDefaultSettings();
    settings.favorites = [
      {
        Servlet: "psp",
        Menu: "M",
        Component: "C",
        Market: "GBL",
        Parameters: "",
        Category: "Campus",
        SubCategory: "Admissions",
        Description: "Rehire",
      },
    ];
    settings.environments = [{ label: "DEV", active: "Yes", trcProfRunning: "No", color: "#2288aa" }];
    settings.recentComponents = [
      {
        Servlet: "psp",
        Menu: "UTILITIES",
        Component: "PEOPLECODE_TRACE",
        Market: "GBL",
        Portal: "EMPLOYEE",
        Node: "HRMS",
        Site: "ps",
        visitedAt: 1,
      },
    ];
    mountBar({
      settings,
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      traceSettings: createDefaultSettings().traceSettings,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });
    expect(document.getElementById("mpu-ui-mode")?.textContent).toBeTruthy();
    const shortcutsBtn = document.getElementById("mpu-fav");
    expect(shortcutsBtn?.textContent).toBe("Shortcuts");
    expect(shortcutsBtn?.getAttribute("aria-haspopup")).toBe("menu");
    shortcutsBtn?.click();
    expect(shortcutsBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector(".mpu-flyout")).toBeTruthy();
    expect(document.getElementById("mpu-fav-filter")).toBeTruthy();
    expect(document.querySelector('.mpu-menu-action')?.textContent).toBe("Add to Shortcuts");
    expect(document.getElementById("mpu-fav-select")).toBeNull();
    expect(document.getElementById("mpu-fav-newwin")).toBeTruthy();
    expect(document.getElementById("mpu-recent-select")).toBeTruthy();
    const env = document.querySelector(".mpu-env") as HTMLElement;
    expect(env.style.getPropertyValue("--mpu-env-color")).toBe("#2288aa");
  });

  it("buildFavoriteTree groups category and subcategory", () => {
    const tree = buildFavoriteTree([
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
        Category: "HR",
        SubCategory: "Payroll",
        Description: "Two",
      },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.category).toBe("HR");
    expect(tree[0]?.leaves).toHaveLength(1);
    expect(tree[0]?.subgroups).toHaveLength(1);
    expect(tree[0]?.subgroups[0]?.subcategory).toBe("Payroll");
  });

  it("pages flyout and dialog mark the current tab", () => {
    document.body.innerHTML = `
      <div id="PT_HEADER"></div>
      <div id="pstabs">
        <a href="#1" class="PSACTIVETAB">General</a>
        <a href="#2">Job Data</a>
      </div>
    `;

    mountBar({
      settings: createDefaultSettings(),
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      traceSettings: createDefaultSettings().traceSettings,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
    });

    document.getElementById("mpu-pagetabs")?.click();
    const flyoutCurrent = document.querySelector(
      '.mpu-flyout[aria-label="Pages"] .mpu-menu-current',
    );
    expect(flyoutCurrent?.textContent).toBe("General");
    expect(flyoutCurrent?.getAttribute("aria-current")).toBe("page");

    showPageTabsDialog(document);
    const dialogCurrent = document.querySelector("#mpu-tabs-list .mpu-menu-current");
    expect(dialogCurrent?.textContent).toBe("General");
    expect(dialogCurrent?.hasAttribute("disabled")).toBe(true);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.getElementById("mpu-dialog")).toBeNull();
  });

  it("showAddFavoriteDialog submits category, subcategory, and parameters", () => {
    const onSubmit = vi.fn();
    showAddFavoriteDialog(document, {
      defaultDescription: "MENU.COMP — Page",
      existingFavorites: [
        {
          Servlet: "psp",
          Menu: "X",
          Component: "Y",
          Market: "GBL",
          Parameters: "",
          Category: "Campus",
          SubCategory: "HR",
          Description: "Existing",
        },
      ],
      onSubmit,
    });

    (document.getElementById("mpu-sc-desc") as HTMLInputElement).value = "My shortcut";
    (document.getElementById("mpu-sc-cat") as HTMLInputElement).value = "Campus";
    (document.getElementById("mpu-sc-sub") as HTMLInputElement).value = "Admissions";
    document.getElementById("mpu-sc-params-toggle")?.click();
    (document.getElementById("mpu-sc-params") as HTMLInputElement).value = "ICACTION=EDIT";
    document
      .getElementById("mpu-sc-form")
      ?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));

    expect(onSubmit).toHaveBeenCalledWith({
      Description: "My shortcut",
      Category: "Campus",
      SubCategory: "Admissions",
      Parameters: "?ICACTION=EDIT",
      Notes: "",
    });
    expect(document.getElementById("mpu-dialog")).toBeNull();
  });

  it("shows Go to dialog and builds navigation URL", () => {
    const onGo = vi.fn();
    mountBar({
      settings: createDefaultSettings(),
      parsed,
      envLabel: "DEV",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      traceSettings: createDefaultSettings().traceSettings,
      onTraceToggle: vi.fn(),
      onPageInfo: vi.fn(),
      onFieldInspector: vi.fn(),
      onNewWindow: vi.fn(),
      onAddFavorite: vi.fn(),
      onGoToComponent: onGo,
    });
    document.getElementById("mpu-goto")?.click();
    expect(onGo).toHaveBeenCalledOnce();

    let navigated = "";
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return navigated || parsed.href;
        },
        set href(v: string) {
          navigated = v;
        },
      },
    });

    showGoToComponentDialog(document, parsed);
    expect(document.getElementById("mpu-goto-title")?.textContent).toBe("Go to component");
    (document.getElementById("mpu-goto-menu") as HTMLInputElement).value = "UTILITIES";
    (document.getElementById("mpu-goto-comp") as HTMLInputElement).value = "PEOPLECODE_TRACE";
    (document.getElementById("mpu-goto-market") as HTMLInputElement).value = "GBL";
    document
      .getElementById("mpu-goto-form")
      ?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(navigated).toBe(
      "https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/UTILITIES.PEOPLECODE_TRACE.GBL",
    );
  });
});
