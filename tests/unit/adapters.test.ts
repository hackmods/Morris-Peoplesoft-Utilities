import { describe, expect, it, beforeEach } from "vitest";
import {
  collectPageMeta,
  detectUiModel,
  extractPageMeta,
  findHeaderMount,
  formatPageInfoMarkdown,
  formatPageInfoPlain,
  getTargetDocument,
  parseConnectionComment,
  parsePsUrl,
  buildComponentUrl,
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

describe("buildComponentUrl", () => {
  it("builds Menu.Component.Market paths and optional newwin site", () => {
    expect(
      buildComponentUrl({
        baseURL: "https://hr.example.edu",
        servlet: "psp",
        site: "ps",
        portal: "EMPLOYEE",
        node: "HRMS",
        menu: "MENU",
        component: "COMP",
        market: "GBL",
        parameters: "?x=1",
      }),
    ).toBe("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/MENU.COMP.GBL?x=1");

    expect(
      buildComponentUrl({
        baseURL: "https://hr.example.edu/",
        servlet: "psc",
        site: "ps_2",
        portal: "EMPLOYEE",
        node: "HRMS",
        menu: "M",
        component: "C",
        newWin: true,
      }),
    ).toBe("https://hr.example.edu/psc/ps_newwin/EMPLOYEE/HRMS/c/M.C.GBL");
  });

  it("returns null when required parts missing", () => {
    expect(
      buildComponentUrl({
        baseURL: "",
        servlet: "psp",
        site: "ps",
        portal: "EMPLOYEE",
        node: "HRMS",
        menu: "M",
        component: "C",
      }),
    ).toBeNull();
  });
});

describe("parseConnectionComment", () => {
  it("parses semicolon-delimited ToolsRel without requiring field order beyond keys", () => {
    const meta = parseConnectionComment(
      "SID=abc; ToolsRel=8.61.15; User=RMORRIS; AppServ=//WCSVDCAPP11:9410",
    );
    expect(meta.userId).toBe("RMORRIS");
    expect(meta.toolsRel).toBe("8.61.15");
    expect(meta.appServer).toBe("//WCSVDCAPP11:9410");
  });

  it("parses newline-delimited connection comments", () => {
    const meta = parseConnectionComment(`
User=RMORRIS
ToolsRel=8.61.15
AppServ=//appserver:9000
`);
    expect(meta.toolsRel).toBe("8.61.15");
    expect(meta.userId).toBe("RMORRIS");
  });

  it("captures ToolsRel even when AppServ is absent", () => {
    const meta = parseConnectionComment("User=BA1; ToolsRel=8.60.05;");
    expect(meta.toolsRel).toBe("8.60.05");
    expect(meta.userId).toBe("BA1");
    expect(meta.appServer).toBeUndefined();
  });

  it("parses DB name, type, and apps release", () => {
    const meta = parseConnectionComment(
      "User=X; ToolsRel=8.61; DBName=CSDEV; DBType=MICROSOFT; AppsRel=Campus.9.20; AppServ=//h:1",
    );
    expect(meta.dbName).toBe("CSDEV");
    expect(meta.dbType).toBe("MICROSOFT");
    expect(meta.appsRel).toBe("Campus.9.20");
  });

  it("returns empty for unrelated comments", () => {
    expect(parseConnectionComment(" just a note ")).toEqual({});
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

  it("parses multiline connection comment for ToolsRel", () => {
    document.documentElement.innerHTML = `
      <head></head>
      <body>
        <!--
          User=RMORRIS;
          SID=abc;
          ToolsRel=8.61.15;
          AppServ=//WCSVDCAPP11:9410
        -->
        <div id="pt_pageinfo" menu="NUI_FRAMEWORK" component="PT_LANDINGPAGE" page="PT_LANDINGPAGE"></div>
      </body>`;
    const meta = extractPageMeta(document);
    expect(meta.toolsRel).toBe("8.61.15");
    expect(meta.page).toBe("PT_LANDINGPAGE");
  });

  it("reads document-level comments before html", () => {
    const comment = document.createComment(
      " User=RMORRIS; ToolsRel=8.61.15; AppServ=//host:9410 ",
    );
    document.insertBefore(comment, document.documentElement);
    const meta = extractPageMeta(document);
    expect(meta.toolsRel).toBe("8.61.15");
    comment.remove();
  });

  it("reads #pt_pageinfo attributes", () => {
    document.body.innerHTML = `<div id="pt_pageinfo" menu="MENU" component="COMP" page="PAGE"></div>`;
    const meta = extractPageMeta(document);
    expect(meta.menu).toBe("MENU");
    expect(meta.component).toBe("COMP");
    expect(meta.page).toBe("PAGE");
  });

  it("reads nested HTML comments via serialized scan", () => {
    document.body.innerHTML = `<div><span><!-- User=NEST; ToolsRel=8.59.01; AppServ=//n --></span></div>`;
    const meta = extractPageMeta(document);
    expect(meta.toolsRel).toBe("8.59.01");
    expect(meta.userId).toBe("NEST");
  });

  it("reads data-* pageinfo attributes", () => {
    document.body.innerHTML = `<div id="pt_pageinfo" data-menu="DM" data-component="DC" data-page="DP"></div>`;
    const meta = extractPageMeta(document);
    expect(meta.menu).toBe("DM");
    expect(meta.component).toBe("DC");
    expect(meta.page).toBe("DP");
  });

  it("collectPageMeta merges portal + iframe ToolsRel", () => {
    document.body.innerHTML = `
      <div id="ptifrmtarget">
        <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
      </div>
    `;
    const iframe = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement;
    const iframeDoc = iframe.contentDocument!;
    iframeDoc.open();
    iframeDoc.write(`<!doctype html><html><body>
      <!-- User=RMORRIS; ToolsRel=8.61.15; AppServ=//WCSVDCAPP11:9410 -->
      <div id="pt_pageinfo" menu="M" component="C" page="P"></div>
    </body></html>`);
    iframeDoc.close();

    const meta = collectPageMeta(document);
    expect(meta.toolsRel).toBe("8.61.15");
    expect(meta.menu).toBe("M");
    expect(meta.uiMode).toBe("classic");
  });

  it("formats page info plain and markdown", () => {
    const meta = {
      menu: "M",
      component: "C",
      page: "P",
      toolsRel: "8.61",
      dbName: "CSDEV",
      uiMode: "classic",
    };
    const parsed = parsePsUrl("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/M.C.GBL");
    const plain = formatPageInfoPlain(meta, parsed, "JOB.EMPLID");
    expect(plain).toContain("DB Name: CSDEV");
    expect(plain).toContain("Locked field: JOB.EMPLID");
    const md = formatPageInfoMarkdown(meta, parsed, "JOB.EMPLID");
    expect(md).toContain("### PeopleSoft page info");
    expect(md).toContain("| ToolsRel | 8.61 |");
  });
});

describe("header mount and UI model", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("prefers Classic #ptifrmtarget over Fluid headers", () => {
    document.body.innerHTML = `
      <div id="pthdr2container"></div>
      <div id="ptifrmtarget"><iframe id="ptifrmtgtframe"></iframe></div>
    `;
    expect(findHeaderMount(document)?.id).toBe("ptifrmtarget");
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

  it("getTargetDocument follows nested nav collection iframe", () => {
    document.body.innerHTML = `
      <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
    `;
    const outer = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement;
    const outerDoc = outer.contentDocument!;
    outerDoc.open();
    outerDoc.write(`<!doctype html><html><body>
      <iframe class="ps_target-iframe"></iframe>
    </body></html>`);
    outerDoc.close();
    const nested = outerDoc.querySelector(".ps_target-iframe") as HTMLIFrameElement;
    nested.contentDocument!.open();
    nested.contentDocument!.write(`<!doctype html><html><body><p id="inner">ok</p></body></html>`);
    nested.contentDocument!.close();

    expect(getTargetDocument(document).getElementById("inner")?.textContent).toBe("ok");
  });
});
