import { describe, expect, it, vi, beforeEach } from "vitest";
import { computePeopleCodeMask, computeSqlMask, toggleTrace } from "@/features/trace";
import { createDefaultSettings, DEFAULT_TRACE } from "@/storage/schema";
import type { ParsedPsUrl } from "@/adapters/ps-page";
import { resetChromeStorage } from "../setup/chrome-mock";

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

describe("trace masks", () => {
  it("returns zero when all flags off", () => {
    const t = { ...DEFAULT_TRACE };
    for (const k of Object.keys(t) as Array<keyof typeof t>) t[k] = "No";
    expect(computePeopleCodeMask(t)).toBe(0);
    expect(computeSqlMask(t)).toBe(0);
  });

  it("combines selected SQL bits including 4096", () => {
    const t = { ...DEFAULT_TRACE };
    for (const k of Object.keys(t) as Array<keyof typeof t>) t[k] = "No";
    t.SQL0001 = "Yes";
    t.SQL4096 = "Yes";
    expect(computeSqlMask(t)).toBe(1 | 4096);
  });
});

describe("toggleTrace", () => {
  beforeEach(() => {
    resetChromeStorage();
    document.body.innerHTML = `<div id="mpu-live" aria-live="polite"></div>`;
  });

  it("posts to PeopleCode and SQL trace components", async () => {
    const urls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return { ok: true, status: 200 };
    });
    vi.stubGlobal("fetch", fetchMock);

    const settings = createDefaultSettings();
    settings.environments = [{ label: "DEV", active: "Yes", trcProfRunning: "No" }];

    const result = await toggleTrace(settings, parsed, 0, true);
    expect(result.running).toBe(true);
    expect(result.locked).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urls[0]).toContain("PEOPLECODE_TRACE");
    expect(urls[1]).toContain("TRACE_SQL");
  });

  it("marks locked on 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 403 })),
    );
    const settings = createDefaultSettings();
    settings.environments = [{ label: "DEV", active: "Yes", trcProfRunning: "No" }];
    const result = await toggleTrace(settings, parsed, 0, true);
    expect(result.locked).toBe(true);
    expect(result.running).toBe(false);
  });
});
