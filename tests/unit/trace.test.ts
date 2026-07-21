import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  computePeopleCodeMask,
  computeSqlMask,
  toggleTrace,
  applyTraceComponent,
} from "@/features/trace";
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

function traceHtml(ids: string[]): string {
  const checks = ids.map((id) => `<input type="checkbox" id="${id}" />`).join("");
  return `<!doctype html><html><body>
    <form action="/psc/ps_newwin/EMPLOYEE/HRMS/c/UTILITIES.PEOPLECODE_TRACE.GBL" method="post">
      <input type="hidden" id="ICSID" value="SID123" />
      <input type="hidden" id="ICElementNum" value="0" />
      <input type="hidden" id="ICStateNum" value="1" />
      ${checks}
    </form>
  </body></html>`;
}

const PC_IDS = [
  "DEBUG_PEOPLECD_DEBUG_TRACE_ALL",
  "DEBUG_PEOPLECD_DEBUG_LIST",
  "DEBUG_PEOPLECD_DEBUG_SHOW_ASSIGN",
  "DEBUG_PEOPLECD_DEBUG_SHOW_FETCH",
  "DEBUG_PEOPLECD_DEBUG_SHOW_STACK",
  "DEBUG_PEOPLECD_DEBUG_TRACE_START",
  "DEBUG_PEOPLECD_DEBUG_TRACE_EXT",
  "DEBUG_PEOPLECD_DEBUG_TRACE_INT",
  "DEBUG_PEOPLECD_DEBUG_SHOW_PARMS",
  "DEBUG_PEOPLECD_DEBUG_SHOW_PARMSRT",
  "DEBUG_PEOPLECD_DEBUG_SHOW_EACH",
];

const SQL_IDS = [
  "TRACE_SQL_TRACE_SQL_STMT",
  "TRACE_SQL_TRACE_SQL_BIND",
  "TRACE_SQL_TRACE_SQL_CURSOR",
  "TRACE_SQL_TRACE_SQL_API",
  "TRACE_SQL_TRACE_SQL_SSB",
  "TRACE_SQL_TRACE_SQL_DB",
  "TRACE_SQL_TRACE_SQL_MGR",
];

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

describe("applyTraceComponent", () => {
  it("GETs psc site_newwin then POSTs checkbox save with ICSID", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method, body: String(init?.body || "") });
      if (!init?.method || init.method === "GET") {
        return {
          ok: true,
          status: 200,
          text: async () => traceHtml(PC_IDS),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => `processing_win0(2,0);`,
      };
    }) as unknown as typeof fetch;

    const result = await applyTraceComponent(
      "https://hr.example.edu",
      "ps",
      "EMPLOYEE",
      "HRMS",
      "UTILITIES.PEOPLECODE_TRACE.GBL",
      [
        { elId: "DEBUG_PEOPLECD_DEBUG_SHOW_ASSIGN", selected: true },
        { elId: "DEBUG_PEOPLECD_DEBUG_TRACE_START", selected: false },
      ],
      fetchImpl,
    );
    expect(result).toBe("ok");
    expect(calls[0].url).toContain("/psc/ps_newwin/");
    expect(calls[0].url).toContain("UTILITIES.PEOPLECODE_TRACE.GBL");
    expect(calls[1].method).toBe("POST");
    expect(calls[1].body).toContain("ICSID=SID123");
    expect(calls[1].body).toContain("ICAction=%23ICSave");
    expect(calls[1].body).toContain("DEBUG_PEOPLECD_DEBUG_SHOW_ASSIGN=Y");
    expect(calls[1].body).toContain("DEBUG_PEOPLECD_DEBUG_SHOW_ASSIGN$chk=Y");
    expect(calls[1].body).toContain("DEBUG_PEOPLECD_DEBUG_TRACE_START=N");
  });

  it("returns locked when checkboxes are missing", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => `<html><body><form><input id="ICSID" value="x"/><input id="ICElementNum" value="0"/><input id="ICStateNum" value="1"/></form></body></html>`,
    })) as unknown as typeof fetch;
    const result = await applyTraceComponent(
      "https://hr.example.edu",
      "ps",
      "EMPLOYEE",
      "HRMS",
      "UTILITIES.PEOPLECODE_TRACE.GBL",
      [{ elId: "DEBUG_PEOPLECD_DEBUG_SHOW_ASSIGN", selected: true }],
      fetchImpl,
    );
    expect(result).toBe("locked");
  });
});

describe("toggleTrace", () => {
  beforeEach(() => {
    resetChromeStorage();
    document.body.innerHTML = `<div id="mpu-live" aria-live="polite"></div>`;
  });

  it("posts to PeopleCode and SQL trace components via psc _newwin", async () => {
    const urls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      urls.push(String(input));
      if (!init?.method || init.method === "GET") {
        const ids = String(input).includes("TRACE_SQL") ? SQL_IDS : PC_IDS;
        return { ok: true, status: 200, text: async () => traceHtml(ids) };
      }
      return { ok: true, status: 200, text: async () => "processing_win0(2,1);" };
    });
    vi.stubGlobal("fetch", fetchMock);

    const settings = createDefaultSettings();
    settings.environments = [{ label: "DEV", active: "Yes", trcProfRunning: "No" }];

    const result = await toggleTrace(settings, parsed, 0, true);
    expect(result.running).toBe(true);
    expect(result.locked).toBe(false);
    expect(urls.some((u) => u.includes("/psc/ps_newwin/") && u.includes("PEOPLECODE_TRACE"))).toBe(
      true,
    );
    expect(urls.some((u) => u.includes("/psc/ps_newwin/") && u.includes("TRACE_SQL"))).toBe(true);
  });

  it("marks locked on 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 403, text: async () => "" })),
    );
    const settings = createDefaultSettings();
    settings.environments = [{ label: "DEV", active: "Yes", trcProfRunning: "No" }];
    const result = await toggleTrace(settings, parsed, 0, true);
    expect(result.locked).toBe(true);
    expect(result.running).toBe(false);
  });
});
