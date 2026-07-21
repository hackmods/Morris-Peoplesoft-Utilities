import { describe, expect, it, beforeEach } from "vitest";
import {
  detectUiModel,
  extractPageMeta,
  findHeaderMount,
  getTargetDocument,
  parsePsUrl,
} from "@/adapters/ps-page";

describe("parsePsUrl edge cases", () => {
  it("returns unknown for non-PS URLs", () => {
    const p = parsePsUrl("https://example.com/app/home");
    expect(p.kind).toBe("unknown");
    expect(p.servlet).toBeNull();
  });

  it("parses logout", () => {
    expect(parsePsUrl("https://hr.example.edu/psp/ps/?cmd=logout").kind).toBe("logout");
  });

  it("parses homepageNav /s/", () => {
    const p = parsePsUrl("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/s/WEBLIB.FieldFormula");
    expect(p.kind).toBe("homepageNav");
    expect(p.portal).toBe("EMPLOYEE");
  });

  it("handles invalid URL strings safely", () => {
    const p = parsePsUrl("not-a-url");
    expect(p.kind).toBe("unknown");
    expect(p.origin).toBe("");
  });
});

describe("extractPageMeta", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.documentElement.innerHTML = "<head></head><body></body>";
  });

  it("parses HTML comment user metadata", () => {
    document.documentElement.innerHTML = `
      <body>
        <!-- User=RMORRIS; SID=abc; ToolsRel=8.60.05; AppServ=//appserver:9000 -->
      </body>`;
    const meta = extractPageMeta(document);
    expect(meta.userId).toBe("RMORRIS");
    expect(meta.toolsRel).toBe("8.60.05");
    expect(meta.appServer).toContain("appserver");
  });

  it("reads #pt_pageinfo attributes", () => {
    document.body.innerHTML = `<div id="pt_pageinfo" menu="MENU" component="COMP" page="PAGE"></div>`;
    const meta = extractPageMeta(document);
    expect(meta.menu).toBe("MENU");
    expect(meta.component).toBe("COMP");
    expect(meta.page).toBe("PAGE");
  });
});

describe("header mount and UI model", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("prefers Fluid header containers", () => {
    document.body.innerHTML = `<div id="pthdr2container"></div>`;
    expect(findHeaderMount(document)?.id).toBe("pthdr2container");
    expect(detectUiModel(document)).toBe("fluid");
  });

  it("detects nav collections", () => {
    document.body.innerHTML = `<iframe class="ps_target-iframe"></iframe>`;
    expect(detectUiModel(document)).toBe("navCollection");
  });

  it("falls back to body for mount", () => {
    expect(findHeaderMount(document)).toBe(document.body);
  });

  it("getTargetDocument returns same doc without frames", () => {
    expect(getTargetDocument(document)).toBe(document);
  });
});
