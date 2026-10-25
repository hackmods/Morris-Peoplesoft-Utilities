import { describe, expect, it, vi } from "vitest";
import {
  loadSettings,
  saveSettings,
  updateSettings,
  originAllowed,
  migrateFromLegacy,
} from "@/storage/settings";
import {
  createDefaultSettings,
  featureAllowedForUi,
  pushRecentComponent,
} from "@/storage/schema";
import { getChromeStorageSnapshot, resetChromeStorage } from "../setup/chrome-mock";

describe("storage load/save/update", () => {
  it("recovers valid saved entries without rewriting corrupt data during a read", async () => {
    const favorite = { Servlet: "psp", Menu: "M", Component: "C", Market: "GBL", Parameters: "", Category: "", SubCategory: "", Description: "Keep" };
    const stored = {
      ...createDefaultSettings(), favorites: [null, favorite], recentComponents: [null],
      customizationWatches: [null], fieldEntryProfiles: [null], hostAllowlist: [null, "https://hr.example.edu"],
      features: { hostAllowlistEnabled: "Yes", fieldEntryOption: "invalid", pageInfoOption: "No" },
      environments: [null, { label: "QA", active: "No", trcProfRunning: "No" }],
      urlSites: { "https://hr.example.edu": { ps: { envId: 1 }, broken: null } },
    };
    resetChromeStorage({ mpuSettings: stored });
    const loaded = await loadSettings();
    expect(loaded.favorites).toEqual([favorite]);
    expect(loaded.recentComponents).toEqual([]);
    expect(loaded.customizationWatches).toEqual([]);
    expect(loaded.fieldEntryProfiles).toEqual([]);
    expect(loaded.hostAllowlist).toEqual(["https://hr.example.edu"]);
    expect(loaded.features.fieldEntryOption).toBe("No");
    expect(loaded.features.pageInfoOption).toBe("No");
    expect(loaded.environments[0].active).toBe("No");
    expect(loaded.environments[1].label).toBe("QA");
    expect(loaded.urlSites).toEqual({ "https://hr.example.edu": { ps: { envId: 1 } } });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
    expect(getChromeStorageSnapshot().mpuSettings).toBe(stored);
  });

  it.each([null, [], "invalid", { features: null }, { features: { hostAllowlistEnabled: "invalid" } }])("keeps unreadable host restrictions closed: %j", async (stored) => {
    resetChromeStorage({ mpuSettings: stored });
    expect(originAllowed("https://hr.example.edu", await loadSettings())).toBe(false);
  });

  it("handles malformed legacy collections without throwing or retaining credentials", async () => {
    resetChromeStorage({ psutilEnvs: [null, { label: "QA", active: "Yes", creds: {} }], shortcutstable: [null], psutilTraceSettings: "broken" });
    const loaded = await loadSettings();
    expect(loaded.environments[0].active).toBe("No");
    expect(loaded.environments[1].active).toBe("Yes");
    expect(loaded.environments[1]).not.toHaveProperty("creds");
    expect(loaded.favorites).toEqual([]);
  });

  it("installation cleanup tolerates corrupt legacy entries and still strips credentials", async () => {
    resetChromeStorage({ mpuSettings: createDefaultSettings(), psutilEnvs: [null, { label: "QA", creds: { user: "old" } }] });
    await import("@/background/service-worker");
    const installed = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls.at(-1)![0];
    await installed({ reason: "update" as chrome.runtime.OnInstalledReason });
    expect(getChromeStorageSnapshot().psutilEnvs).toEqual([null, { label: "QA" }]);
  });

  it("seeds defaults when storage empty", async () => {
    const s = await loadSettings();
    expect(s.schemaVersion).toBe(1);
    expect(s.features.hostAllowlistEnabled).toBe("No");
    expect(s.features.traceOption).toBe("No");
    expect(s.showOnboarding).toBe("No");
    expect(s.fieldCopyFormat).toBe("record.field");
    expect(getChromeStorageSnapshot().mpuSettings).toBeTruthy();
  });

  it("persists onboarding flag and PeopleCode copy format", async () => {
    const s = createDefaultSettings();
    s.showOnboarding = "Yes";
    s.fieldCopyFormat = "getfield";
    await saveSettings(s);
    const loaded = await loadSettings();
    expect(loaded.showOnboarding).toBe("Yes");
    expect(loaded.fieldCopyFormat).toBe("getfield");
  });

  it("persists bar placement and sticky preferences", async () => {
    const s = createDefaultSettings();
    s.barPlacement = "documentTop";
    s.barSticky = "Yes";
    await saveSettings(s);
    const loaded = await loadSettings();
    expect(loaded.barPlacement).toBe("documentTop");
    expect(loaded.barSticky).toBe("Yes");
  });

  it("defaults invalid barPlacement to aboveContent", async () => {
    await chrome.storage.local.set({
      mpuSettings: {
        ...createDefaultSettings(),
        barPlacement: "sideways",
        barSticky: "Maybe",
      },
    });
    const loaded = await loadSettings();
    expect(loaded.barPlacement).toBe("aboveContent");
    expect(loaded.barSticky).toBe("No");
  });

  it("persists getrowset copy format", async () => {
    const s = createDefaultSettings();
    s.fieldCopyFormat = "getrowset";
    await saveSettings(s);
    const loaded = await loadSettings();
    expect(loaded.fieldCopyFormat).toBe("getrowset");
  });

  it("round-trips settings", async () => {
    const s = createDefaultSettings();
    s.favorites.push({
      Servlet: "psp",
      Menu: "M",
      Component: "C",
      Market: "GBL",
      Parameters: "",
      Category: "Cat",
      SubCategory: "",
      Description: "Demo",
    });
    s.recentComponents = pushRecentComponent([], {
      Servlet: "psp",
      Menu: "M",
      Component: "C",
      Market: "GBL",
      Portal: "EMPLOYEE",
      Node: "HRMS",
      Site: "ps",
      visitedAt: 1,
    });
    await saveSettings(s);
    const loaded = await loadSettings();
    expect(loaded.favorites).toHaveLength(1);
    expect(loaded.favorites[0].Description).toBe("Demo");
    expect(loaded.recentComponents).toHaveLength(1);
    expect(loaded.recentComponents[0].Component).toBe("C");
  });

  it("pushRecentComponent de-dupes and caps", () => {
    let list = pushRecentComponent([], {
      Servlet: "psp",
      Menu: "A",
      Component: "C1",
      Market: "GBL",
      Portal: "P",
      Node: "N",
      Site: "ps",
      visitedAt: 1,
    });
    list = pushRecentComponent(list, {
      Servlet: "psp",
      Menu: "A",
      Component: "C2",
      Market: "GBL",
      Portal: "P",
      Node: "N",
      Site: "ps",
      visitedAt: 2,
    });
    list = pushRecentComponent(list, {
      Servlet: "psp",
      Menu: "A",
      Component: "C1",
      Market: "GBL",
      Portal: "P",
      Node: "N",
      Site: "ps",
      visitedAt: 3,
    });
    expect(list.map((r) => r.Component)).toEqual(["C1", "C2"]);
    expect(list[0].visitedAt).toBe(3);
  });

  it("featureAllowedForUi respects Classic/Fluid scopes", () => {
    expect(featureAllowedForUi("both", "fluid")).toBe(true);
    expect(featureAllowedForUi("classic", "fluid")).toBe(false);
    expect(featureAllowedForUi("fluid", "fluid")).toBe(true);
    expect(featureAllowedForUi("classic", "navCollection")).toBe(true);
    expect(featureAllowedForUi("fluid", "navCollection")).toBe(false);
  });

  it("updateSettings applies patches", async () => {
    await loadSettings();
    const next = await updateSettings((cur) => ({
      ...cur,
      quietEnvPrompt: "Yes",
      hostAllowlist: ["https://hr.college.edu"],
    }));
    expect(next.quietEnvPrompt).toBe("Yes");
    expect(next.hostAllowlist).toEqual(["https://hr.college.edu"]);
  });

  it("migrates legacy keys on first load", async () => {
    resetChromeStorage({
      userIdOption: "No",
      shortcutstable: [
        {
          Servlet: "psc",
          Menu: "LEGACY",
          Component: "PAGE",
          Market: "GBL",
          Parameters: "",
          Category: "",
          SubCategory: "",
          Description: "Old fav",
        },
      ],
      psutilEnvs: [{ label: "QA", active: "Yes", trcProfRunning: "Yes", creds: { u: "x" } }],
      psutilTraceSettings: [{ PC0004: "Yes", SQL0001: "No" }],
    });
    const migrated = await loadSettings();
    expect(migrated.features.userIdOption).toBe("No");
    expect(migrated.favorites[0].Menu).toBe("LEGACY");
    expect(migrated.environments[0].label).toBe("QA");
    expect(migrated.environments[0]).not.toHaveProperty("creds");
    expect(migrated.traceSettings.SQL0001).toBe("No");
  });
});

describe("originAllowed", () => {
  it("allows all hosts when allowlist disabled", () => {
    const s = createDefaultSettings();
    expect(originAllowed("https://anywhere.edu/psp/ps/c/x", s)).toBe(true);
  });

  it("blocks when enabled and empty", () => {
    const s = createDefaultSettings();
    s.features.hostAllowlistEnabled = "Yes";
    s.hostAllowlist = [];
    expect(originAllowed("https://hr.college.edu/psp/ps/c/x", s)).toBe(false);
  });

  it("matches origin with path suffixes ignored", () => {
    const s = createDefaultSettings();
    s.features.hostAllowlistEnabled = "Yes";
    s.hostAllowlist = ["https://hr.college.edu"];
    expect(originAllowed("https://hr.college.edu/psp/ps/EMPLOYEE/HRMS/c/A.B.GBL", s)).toBe(
      true,
    );
  });

  it("returns false for invalid page URLs when allowlist on", () => {
    const s = createDefaultSettings();
    s.features.hostAllowlistEnabled = "Yes";
    s.hostAllowlist = ["https://hr.college.edu"];
    expect(originAllowed("::::::", s)).toBe(false);
  });
});

describe("migrateFromLegacy pure", () => {
  it("uses defaults when legacy fields missing", () => {
    const m = migrateFromLegacy({});
    expect(m.favorites).toEqual([]);
    expect(m.features.advSearchOption).toBe("Yes");
  });
});
