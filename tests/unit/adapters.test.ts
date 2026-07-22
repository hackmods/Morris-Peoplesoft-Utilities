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
  detectPageTokenPresent,
  comparePageInfoToBuffer,
  compareKeyValueBuffer,
  detectFluidCrefPath,
  detectFluidTheme,
  formatFavoriteDescriptionTemplate,
  toolsRelTips,
  collectPageTabs,
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
      pageTokenPresent: true,
    };
    const parsed = parsePsUrl("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/M.C.GBL");
    const plain = formatPageInfoPlain(meta, parsed, "JOB.EMPLID");
    expect(plain).toContain("DB Name: CSDEV");
    expect(plain).toContain("Page token: present");
    expect(plain).toContain("Locked field: JOB.EMPLID");
    expect(plain).not.toMatch(/ICSID\s*=/);
    const md = formatPageInfoMarkdown(meta, parsed, "JOB.EMPLID");
    expect(md).toContain("### PeopleSoft page info");
    expect(md).toContain("| ToolsRel | 8.61 |");
    expect(md).toContain("| Page token | present |");
  });

  it("compares page info buffers and builds favorite templates", () => {
    const current = formatPageInfoPlain(
      { menu: "M", component: "C", toolsRel: "8.61", uiMode: "classic" },
      parsePsUrl("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/M.C.GBL"),
    );
    const other = current.replace("ToolsRel: 8.61", "ToolsRel: 8.60").replace("Component: C", "Component: OTHER");
    const { lines, changedCount } = comparePageInfoToBuffer(current, other);
    expect(changedCount).toBeGreaterThanOrEqual(2);
    expect(lines.find((l) => l.key === "ToolsRel")?.changed).toBe(true);

    const template = formatFavoriteDescriptionTemplate(
      { menu: "M", component: "C", page: "P", toolsRel: "8.61", dbName: "CSDEV" },
      parsePsUrl("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/M.C.GBL"),
      "JOB.EMPLID",
    );
    expect(template).toContain("M.C.GBL");
    expect(template).toContain("ToolsRel 8.61");
    expect(template).toContain("Field JOB.EMPLID");
  });

  it("detects page token presence without exposing value", () => {
    document.body.innerHTML = `<input type="hidden" id="ICSID" value="SECRET_TOKEN_VALUE" />`;
    expect(detectPageTokenPresent(document)).toBe(true);
    const meta = extractPageMeta(document);
    expect(meta.pageTokenPresent).toBe(true);
    const plain = formatPageInfoPlain(
      meta,
      parsePsUrl("https://hr.example.edu/psp/ps/EMPLOYEE/HRMS/c/M.C.GBL"),
    );
    expect(plain).toContain("Page token: present");
    expect(plain).not.toContain("SECRET_TOKEN_VALUE");
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

  it("loginMode mounts above the password form without reading values", () => {
    document.body.innerHTML = `
      <div id="wrap">
        <form id="login">
          <input type="text" name="userid" value="secret-user" />
          <input type="password" name="pwd" value="secret-pass" />
        </form>
      </div>
    `;
    const mount = findHeaderMount(document, { loginMode: true });
    expect(mount?.id).toBe("login");
    const pwd = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(pwd.value).toBe("secret-pass");
  });

  it("toolsRelTips are context-sensitive for Classic / Fluid / missing ToolsRel", () => {
    const classic = toolsRelTips("8.61.15", "classic");
    expect(classic.some((t) => /ptifrmtgtframe/i.test(t))).toBe(true);
    expect(classic.some((t) => /ToolsRel 8\.61/.test(t))).toBe(true);

    const fluid = toolsRelTips("8.60", "fluid");
    expect(fluid.some((t) => /Fluid/i.test(t))).toBe(true);

    const missing = toolsRelTips(undefined, "classic");
    expect(missing.some((t) => /not detected/i.test(t))).toBe(true);
  });

  it("collectPageTabs de-dupes delivered tab labels", () => {
    document.body.innerHTML = `
      <div id="pstabs">
        <a href="#1">General</a>
        <a href="#2">General</a>
        <a href="#3">Job Data</a>
      </div>
    `;
    const tabs = collectPageTabs(document);
    expect(tabs.map((t) => t.label)).toEqual(["General", "Job Data"]);
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
    nested.contentDocument!.write(`<!doctype html><html><body><p id="inner">ok</p><input id="JOB_EMPLID$0" /></body></html>`);
    nested.contentDocument!.close();

    expect(getTargetDocument(document).getElementById("inner")?.textContent).toBe("ok");
  });

  it("getTargetDocument keeps Classic fields when nested iframe is empty", () => {
    document.body.innerHTML = `
      <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
    `;
    const outer = document.getElementById("ptifrmtgtframe") as HTMLIFrameElement;
    const outerDoc = outer.contentDocument!;
    outerDoc.open();
    outerDoc.write(`<!doctype html><html><body>
      <input id="PRCSRUNCNTL_RUN_CNTL_ID" value="TEST" />
      <iframe class="ps_target-iframe"></iframe>
    </body></html>`);
    outerDoc.close();
    const nested = outerDoc.querySelector(".ps_target-iframe") as HTMLIFrameElement;
    nested.contentDocument!.open();
    nested.contentDocument!.write(`<!doctype html><html><body></body></html>`);
    nested.contentDocument!.close();

    expect((getTargetDocument(document).getElementById("PRCSRUNCNTL_RUN_CNTL_ID") as HTMLInputElement).value).toBe(
      "TEST",
    );
  });

  it("getTargetDocument follows Fluid nav iframe into nested Classic page", () => {
    document.body.innerHTML = `
      <div id="PT_HEADER"></div>
      <iframe class="ps_target-iframe"></iframe>
    `;
    const outer = document.querySelector(".ps_target-iframe") as HTMLIFrameElement;
    const outerDoc = outer.contentDocument!;
    outerDoc.open();
    outerDoc.write(`<!doctype html><html><body>
      <div class="ps_box-control"><span>shell</span></div>
      <iframe id="ptifrmtgtframe" name="TargetContent"></iframe>
    </body></html>`);
    outerDoc.close();
    const classic = outerDoc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement;
    classic.contentDocument!.open();
    classic.contentDocument!.write(
      `<!doctype html><html><body><input id="JOB_EMPLID$0" value="1" /></body></html>`,
    );
    classic.contentDocument!.close();

    expect(getTargetDocument(document).getElementById("JOB_EMPLID$0")).toBeTruthy();
  });

  it("detects Fluid CREF path and theme from DOM (FL-02/03)", () => {
    document.documentElement.className = "ptal-theme-redwood";
    document.body.innerHTML = `<nav class="ps_breadcrumb"><a>Home</a><span>Employees</span></nav>`;
    expect(detectFluidCrefPath(document)).toContain("Home");
    expect(detectFluidTheme(document)).toBe("ptal-theme-redwood");
  });

  it("compareKeyValueBuffer diffs arbitrary key lists (AD-04)", () => {
    const current = "Menu: A\nComponent: B\nToolsRel: 8.60";
    const other = "Menu: A\nComponent: C\nToolsRel: 8.60";
    const { changedCount, lines } = compareKeyValueBuffer(current, other, ["Menu", "Component", "ToolsRel"]);
    expect(changedCount).toBe(1);
    expect(lines.find((l) => l.key === "Component")?.changed).toBe(true);
  });
});
