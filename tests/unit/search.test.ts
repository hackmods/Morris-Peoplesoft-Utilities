import { describe, expect, it, beforeEach } from "vitest";
import { runSearchOptions } from "@/features/search";
import { createDefaultSettings } from "@/storage/schema";

describe("search options inject selection", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("injects combined script when both enabled", () => {
    const s = createDefaultSettings();
    s.features.correctHistoryOption = "Yes";
    s.features.advSearchOption = "Yes";
    runSearchOptions(s);
    const script = document.querySelector("script");
    expect(script?.src).toContain("inject/corr-hist-and-adv-search.js");
  });

  it("injects only corr-hist when adv off", () => {
    const s = createDefaultSettings();
    s.features.correctHistoryOption = "Yes";
    s.features.advSearchOption = "No";
    runSearchOptions(s);
    expect(document.querySelector("script")?.src).toContain("inject/corr-hist.js");
  });

  it("injects only adv-search when corr off", () => {
    const s = createDefaultSettings();
    s.features.correctHistoryOption = "No";
    s.features.advSearchOption = "Yes";
    runSearchOptions(s);
    expect(document.querySelector("script")?.src).toContain("inject/adv-search.js");
  });

  it("no-ops when both disabled", () => {
    const s = createDefaultSettings();
    s.features.correctHistoryOption = "No";
    s.features.advSearchOption = "No";
    runSearchOptions(s);
    expect(document.querySelector("script")).toBeNull();
  });
});
