import { describe, expect, it } from "vitest";
import { FEATURE_LABELS, FEATURE_TOGGLE_GROUPS } from "@/storage/feature-labels";
import { createDefaultSettings } from "@/storage/schema";
import { remapUrlSitesAfterDelete, removeEnvironmentAt } from "@/storage/env-map";
import {
  favoritesToCsv,
  isSettingsBackup,
  parseFavoritesCsv,
} from "@/storage/favorites-io";

describe("removeEnvironmentAt", () => {
  it("remaps urlSites indexes and drops deleted mappings", () => {
    const settings = createDefaultSettings();
    settings.environments = [
      { label: "DEV", active: "Yes", trcProfRunning: "No" },
      { label: "QA", active: "Yes", trcProfRunning: "No" },
      { label: "PRD", active: "Yes", trcProfRunning: "No" },
    ];
    settings.urlSites = {
      "https://hr.example.edu": {
        hrdev: { envId: 0 },
        hrqa: { envId: 1 },
        hrprd: { envId: 2 },
      },
    };

    const next = removeEnvironmentAt(settings, 1);
    expect(next.environments.map((e) => e.label)).toEqual(["DEV", "PRD"]);
    expect(next.urlSites["https://hr.example.edu"]).toEqual({
      hrdev: { envId: 0 },
      hrprd: { envId: 1 },
    });
  });

  it("no-ops for out-of-range indexes", () => {
    const settings = createDefaultSettings();
    settings.environments = [{ label: "DEV", active: "Yes", trcProfRunning: "No" }];
    expect(removeEnvironmentAt(settings, 3)).toBe(settings);
  });
});

describe("remapUrlSitesAfterDelete", () => {
  it("removes empty baseURL buckets", () => {
    const mapped = remapUrlSitesAfterDelete(
      { "https://a.example": { only: { envId: 0 } } },
      0,
    );
    expect(mapped).toEqual({});
  });
});

describe("favorites CSV IO", () => {
  it("round-trips favorites with escaped quotes", () => {
    const csv = favoritesToCsv([
      {
        Servlet: "psp",
        Menu: "MENU",
        Component: "COMP",
        Market: "GBL",
        Parameters: "",
        Category: "Cat",
        SubCategory: "",
        Description: `Say "hello"`,
      },
    ]);
    const parsed = parseFavoritesCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].Description).toBe(`Say "hello"`);
    expect(parsed[0].Menu).toBe("MENU");
  });

  it("returns empty for header-only CSV", () => {
    expect(parseFavoritesCsv("Servlet,Menu\n")).toEqual([]);
  });
});

describe("isSettingsBackup", () => {
  it("accepts plain objects only", () => {
    expect(isSettingsBackup({ features: {} })).toBe(true);
    expect(isSettingsBackup([])).toBe(false);
    expect(isSettingsBackup(null)).toBe(false);
  });
});

describe("FEATURE_LABELS / groups", () => {
  it("covers the popup/options toggle set once each", () => {
    expect(FEATURE_LABELS.map((f) => f.key)).toContain("advSearchOption");
    expect(FEATURE_LABELS).toHaveLength(11);
    const keys = FEATURE_LABELS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("groups essentials on and careful features off by default", () => {
    const f = createDefaultSettings().features;
    const essential = FEATURE_TOGGLE_GROUPS.find((g) => g.id === "bar")!.items.map((i) => i.key);
    const helpers = FEATURE_TOGGLE_GROUPS.find((g) => g.id === "helpers")!.items.map((i) => i.key);
    const careful = FEATURE_TOGGLE_GROUPS.find((g) => g.id === "careful")!.items.map((i) => i.key);
    for (const key of [...essential, ...helpers]) {
      expect(f[key]).toBe("Yes");
    }
    for (const key of careful) {
      expect(f[key]).toBe("No");
    }
    expect(f.hostAllowlistEnabled).toBe("No");
  });
});
