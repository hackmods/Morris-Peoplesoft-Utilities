import { describe, expect, it } from "vitest";
import { parsePsUrl } from "@/adapters/ps-page";
import { loadSettings, saveSettings, originAllowed } from "@/storage/settings";
import { createDefaultSettings } from "@/storage/schema";
import { mountBar, removeBar } from "@/features/bar";
import { runSearchOptions } from "@/features/search";
import { resetChromeStorage } from "../setup/chrome-mock";

describe("integration: BA session bootstrap", () => {
  it("configures env, mounts bar on Fluid header, and prepares search helpers", async () => {
    resetChromeStorage();
    const href =
      "https://hr.college.edu/psp/csprd/EMPLOYEE/HRMS/c/ROLE_MANAGER.USER_PROFILE.GBL";
    const parsed = parsePsUrl(href);
    expect(parsed.kind).toBe("component");

    const settings = createDefaultSettings();
    settings.environments = [
      { label: "CSPRD", active: "Yes", trcProfRunning: "No", color: "#b8922a" },
    ];
    settings.urlSites = {
      [parsed.baseURL]: { [parsed.siteNormalized]: { envId: 0 } },
    };
    settings.favorites = [
      {
        Servlet: "psp",
        Menu: "ROLE_MANAGER",
        Component: "USER_PROFILE",
        Market: "GBL",
        Parameters: "",
        Category: "Security",
        SubCategory: "",
        Description: "User Profile",
      },
    ];
    settings.features.correctHistoryOption = "Yes";
    await saveSettings(settings);

    const loaded = await loadSettings();
    expect(originAllowed(href, loaded)).toBe(true);

    document.body.innerHTML = `<div id="pthdr2container"></div>`;

    mountBar({
      settings: loaded,
      parsed,
      envLabel: "CSPRD",
      fieldInspectorActive: false,
      traceRunning: false,
      traceLocked: false,
      traceSettings: createDefaultSettings().traceSettings,
      onTraceToggle: () => undefined,
      onPageInfo: () => undefined,
      onFieldInspector: () => undefined,
      onNewWindow: () => undefined,
      onAddFavorite: () => undefined,
    });

    expect(document.getElementById("mpu-bar")).toBeTruthy();
    expect(document.querySelector(".mpu-env")?.textContent).toBe("CSPRD");
    expect(document.getElementById("mpu-fav")?.textContent).toBe("Shortcuts");
    expect(document.getElementById("mpu-fav")?.getAttribute("aria-haspopup")).toBe("menu");

    runSearchOptions(loaded);
    expect(document.querySelector("script")?.getAttribute("src")).toContain(
      "corr-hist-and-adv-search.js",
    );

    loaded.features.hostAllowlistEnabled = "Yes";
    loaded.hostAllowlist = ["https://other.college.edu"];
    expect(originAllowed(href, loaded)).toBe(false);
    removeBar();
    expect(document.getElementById("mpu-bar")).toBeNull();
  });
});
