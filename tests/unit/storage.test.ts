import { describe, expect, it } from "vitest";
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
