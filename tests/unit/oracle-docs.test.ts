import { resetChromeStorage } from "../setup/chrome-mock";
import { afterEach, describe, expect, it, vi } from "vitest";
import { filterOracleDocs, getManualFamilyLinks, ORACLE_DOCS, ORACLE_PEOPLETOOLS_LIBRARY_URL, resolvePeopleToolsDocsVersion } from "@/features/oracle-docs";
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

  it("recognizes only exact PeopleTools 8.62 forms and does not infer from malformed input", () => {
    expect(resolvePeopleToolsDocsVersion("")).toEqual({ supported: true, label: "8.62" });
    expect(resolvePeopleToolsDocsVersion("8.62")).toEqual({ supported: true, label: "8.62" });
    expect(resolvePeopleToolsDocsVersion(" 8.62.12 ")).toEqual({ supported: true, label: "8.62", patch: "12" });
    for (const value of ["8.62.12.1", "8.62.x", "8.6", "9.2", "PUM49", "8.620", "8.62."]) expect(resolvePeopleToolsDocsVersion(value).supported).toBe(false);
  });

  it("provides family-specific application indexes", () => {
    expect(getManualFamilyLinks().map((item) => item.id)).toEqual(["hcm", "fscm", "cs"]);
    expect(getManualFamilyLinks().every((item) => item.url.startsWith("https://docs.oracle.com/en/applications/peoplesoft/"))).toBe(true);
  });
});

describe("Oracle docs UI", () => {
  afterEach(() => { document.body.replaceChildren(); });
  it("renders official no-referrer links and states unsupported version fallback honestly", async () => {
    const root = document.createElement("section"); document.body.append(root);
    const cleanup = bindOracleDocs(document, root, "9.2");
    await Promise.resolve();
    expect(root.textContent).toContain("not matched to this PeopleTools 8.62 catalog");
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
