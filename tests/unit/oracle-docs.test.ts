import { resetChromeStorage } from "../setup/chrome-mock";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_ORACLE_DOCS, filterOracleDocs, getManualFamilyLinks, getOracleDocCatalog, ORACLE_CATALOGS, ORACLE_DOCS, ORACLE_PEOPLETOOLS_LIBRARY_URL, resolvePeopleToolsDocsVersion } from "@/features/oracle-docs";
import { bindOracleDocs } from "@/features/oracle-docs-ui";

describe("Oracle PeopleTools documentation catalog", () => {
  it("provides a searchable local snapshot and well formed direct Oracle PDFs", () => {
    expect(ORACLE_DOCS.length).toBeGreaterThanOrEqual(40);
    expect(filterOracleDocs("integration broker administration").map((entry) => entry.id)).toEqual(["integration-broker-admin"]);
    expect(filterOracleDocs("fluid", "Development Tools").map((entry) => entry.id)).toContain("fluid-ui");
    expect(filterOracleDocs("not a manual")).toEqual([]);
    for (const entry of ORACLE_DOCS) {
      const url = new URL(entry.pdfUrl);
      expect(url.origin).toBe("https://docs.oracle.com");
      expect(url.pathname).toMatch(/^\/cd\/G41076_01\/psft\/pdf\/pt862[a-z]+-b112025\.pdf$/);
      expect(entry.id).toBeTruthy();
    }
    expect(ORACLE_PEOPLETOOLS_LIBRARY_URL).toContain("/cd/G41076_01/psft/index.html");
  });

  it("recognizes offered PeopleTools releases/builds and does not infer from malformed input", () => {
    expect(resolvePeopleToolsDocsVersion("")).toEqual({ supported: true, label: "8.62" });
    expect(resolvePeopleToolsDocsVersion("8.62")).toEqual({ supported: true, label: "8.62" });
    expect(resolvePeopleToolsDocsVersion(" 8.62.12 ")).toEqual({ supported: true, label: "8.62", patch: "12" });
    for (const value of ["8.62.12.1", "8.62.x", "8.6", "9.2", "PUM49", "8.620", "8.62."]) expect(resolvePeopleToolsDocsVersion(value).supported).toBe(false);
  });

  it("provides family-specific application indexes", () => {
    expect(getManualFamilyLinks().map((item) => item.id)).toEqual(["hcm", "fscm", "cs"]);
    expect(getManualFamilyLinks().every((item) => item.url.startsWith("https://docs.oracle.com/en/applications/peoplesoft/"))).toBe(true);
  });

  it("indexes actual PDFs for every offered release and application family with distinct preference IDs", () => {
    expect(ORACLE_CATALOGS.map(catalog => catalog.books.length)).toEqual([46, 45, 45, 45, 45, 45, 45, 45, 71, 60, 19]);
    expect(new Set(ALL_ORACLE_DOCS.map(book => book.id)).size).toBe(ALL_ORACLE_DOCS.length);
    expect(ORACLE_DOCS.find(book => book.title === "Query")?.id).toBe("query");
    for (const catalog of ORACLE_CATALOGS) {
      for (const book of catalog.books) {
        expect(new URL(book.pdfUrl).origin).toBe("https://docs.oracle.com");
        expect(new URL(book.pdfUrl).pathname).toMatch(/\.pdf$/);
        if (catalog.family === "tools" && catalog.release !== "8.63") expect(book.pdfUrl).toContain(`pt${catalog.release.replace(".", "")}`);
      }
    }
    expect(getOracleDocCatalog("8.61.06")?.id).toBe("tools-8.61");
    expect(getOracleDocCatalog("9.2")).toBeUndefined();
    expect(filterOracleDocs("payroll north america", "all", getOracleDocCatalog("bad", "hcm")?.books).length).toBe(1);
  });
});

describe("Oracle docs UI", () => {
  afterEach(() => { document.body.replaceChildren(); });
  it("renders official no-referrer links and states unsupported version fallback honestly", async () => {
    const root = document.createElement("section"); document.body.append(root);
    const cleanup = bindOracleDocs(document, root, "9.2");
    await Promise.resolve();
    expect(root.textContent).toContain("not matched to an indexed PeopleTools release");
    expect(root.textContent).toContain("PeopleTools tools version is separate");
    for (const link of root.querySelectorAll<HTMLAnchorElement>("a")) {
      expect(link.rel).toBe("noopener noreferrer");
      expect(link.referrerPolicy).toBe("no-referrer");
    }
    cleanup();
  });

  it("searches and filters locally without changing focus", async () => {
    const root = document.createElement("section"); document.body.append(root);
    const cleanup = bindOracleDocs(document, root);
    await Promise.resolve();
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    const topic = root.querySelector<HTMLSelectElement>("select")!;
    search.focus(); search.value = "PeopleCode language"; search.dispatchEvent(new Event("input"));
    expect(document.activeElement).toBe(search);
    expect(root.querySelectorAll(".oracle-docs-item")).toHaveLength(1);
    expect(root.textContent).toContain("PeopleCode Language Reference");
    topic.value = "Development Tools"; topic.dispatchEvent(new Event("change"));
    expect(root.querySelectorAll(".oracle-docs-item")).toHaveLength(1);
    cleanup();
  });

  it("switches releases and application lists without replacing them with 8.62 or losing existing favorites", async () => {
    resetChromeStorage({ "mpuOracleDocsFavorite:query": true });
    const root = document.createElement("section"); document.body.append(root);
    const cleanup = bindOracleDocs(document, root);
    await Promise.resolve();
    const tools = root.querySelector<HTMLInputElement>('input[type="text"]')!;
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    const family = root.querySelector<HTMLSelectElement>("select")!;
    const view = root.querySelectorAll<HTMLSelectElement>("select")[2];
    search.value = "query"; search.dispatchEvent(new Event("input"));
    tools.value = "8.61.06"; tools.dispatchEvent(new Event("input"));
    expect(root.querySelector(".oracle-docs-item a")?.getAttribute("href")).toContain("pt861tpsq");
    view.value = "favorites"; view.dispatchEvent(new Event("change"));
    expect(root.querySelectorAll(".oracle-docs-item")).toHaveLength(0);
    tools.value = "8.62"; tools.dispatchEvent(new Event("input"));
    expect(root.querySelectorAll(".oracle-docs-item")).toHaveLength(1);
    view.value = "all"; view.dispatchEvent(new Event("change"));
    search.value = ""; search.dispatchEvent(new Event("input"));
    tools.value = "9.2"; tools.dispatchEvent(new Event("input"));
    for (const [id, count, image] of [["hcm", 71, "55"], ["fscm", 60, "57"], ["cs", 19, "39"]] as const) {
      family.value = id; family.dispatchEvent(new Event("change"));
      expect(root.querySelectorAll(".oracle-docs-item")).toHaveLength(count);
      expect(root.textContent).toContain(`Update Image ${image}`);
      expect(tools.disabled).toBe(true);
    }
    family.value = ""; family.dispatchEvent(new Event("change"));
    expect(tools.disabled).toBe(false);
    expect(root.querySelectorAll(".oracle-docs-item")).toHaveLength(0);
    expect(root.textContent).toContain("will not substitute");
    cleanup();
  });

  it("ignores malformed saved preference values and reacts to isolated per-manual changes", async () => {
    resetChromeStorage({
      "mpuOracleDocsFavorite:query": "yes",
      "mpuOracleDocsFavorite:integration-broker": true,
      "mpuOracleDocsFavorite:made-up": true,
      "mpuOracleDocsRecent:query": NaN,
      "mpuOracleDocsRecent:fluid-ui": 123,
    });
    const changed = chrome.storage.onChanged;
    const add = vi.spyOn(changed, "addListener");
    const remove = vi.spyOn(changed, "removeListener");
    const root = document.createElement("section"); document.body.append(root);
    const cleanup = bindOracleDocs(document, root);
    await Promise.resolve();
    const view = root.querySelectorAll<HTMLSelectElement>("select")[2];
    view.value = "favorites"; view.dispatchEvent(new Event("change"));
    expect(root.textContent).toContain("Integration Broker");
    expect(root.querySelectorAll(".oracle-docs-item")).toHaveLength(1);
    view.value = "recent"; view.dispatchEvent(new Event("change"));
    expect(root.textContent).toContain("Fluid User Interface Developer’s Guide");
    expect(add).toHaveBeenCalled(); cleanup(); expect(remove).toHaveBeenCalled();
    add.mockRestore(); remove.mockRestore();
  });
});
