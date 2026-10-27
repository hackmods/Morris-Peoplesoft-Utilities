import snapshot from "./oracle-docs-catalog.json";
export type OracleDocCategory = string;
export interface OracleDoc { id: string; title: string; category: OracleDocCategory; pdfUrl: string; release?: string; }

/** Preserve existing favorite IDs and topic labels; PDF URLs come only from the checked snapshot. */
const originalDocs: readonly Pick<OracleDoc, "id" | "title" | "category">[] = [
  ["accessibility-guide", "Accessibility Guide", "General Information"],
  ["applications-users-guide", "Applications User’s Guide", "General Information"],
  ["getting-started", "Getting Started with PeopleTools", "General Information"],
  ["application-designer", "Application Designer Developer’s Guide", "Development Tools"],
  ["application-engine", "Application Engine", "Development Tools"],
  ["data-distribution", "Data Distribution Framework", "Development Tools"],
  ["documents-technology", "Documents Technology", "Development Tools"],
  ["fluid-ui", "Fluid User Interface Developer’s Guide", "Development Tools"],
  ["global-technology", "Global Technology", "Development Tools"],
  ["optimization-framework", "Optimization Framework", "Development Tools"],
  ["peoplecode-api", "PeopleCode API Reference", "Development Tools"],
  ["portal-technology", "Portal Technology", "Development Tools"],
  ["peoplecode-developer", "PeopleCode Developer’s Guide", "Development Tools"],
  ["peoplecode-language", "PeopleCode Language Reference", "Development Tools"],
  ["search-technology", "Search Technology", "Development Tools"],
  ["analytic-calculation-engine", "Analytic Calculation Engine", "Reporting and Analysis Tools"],
  ["bi-publisher", "BI Publisher for PeopleSoft", "Reporting and Analysis Tools"],
  ["pivot-grid", "Pivot Grid", "Reporting and Analysis Tools"],
  ["process-scheduler", "Process Scheduler", "Reporting and Analysis Tools"],
  ["ps-nvision", "PS/nVision", "Reporting and Analysis Tools"],
  ["query", "Query", "Reporting and Analysis Tools"],
  ["reporting-web-services", "Reporting Web Services", "Reporting and Analysis Tools"],
  ["sqr-developers", "SQR for PeopleSoft Developers", "Reporting and Analysis Tools"],
  ["sqr-language", "SQR Language Reference for PeopleSoft", "Reporting and Analysis Tools"],
  ["tree-manager", "Tree Manager", "Reporting and Analysis Tools"],
  ["component-interfaces", "Component Interfaces", "Integration Tools"],
  ["feed-publishing", "Feed Publishing Framework", "Integration Tools"],
  ["integration-broker", "Integration Broker", "Integration Tools"],
  ["integration-broker-admin", "Integration Broker Administration", "Integration Tools"],
  ["integration-broker-monitor", "Integration Broker Service Operations Monitor", "Integration Tools"],
  ["integration-broker-testing", "Integration Broker Testing Utilities and Tools", "Integration Tools"],
  ["multichannel-framework", "MultiChannel Framework", "Integration Tools"],
  ["supported-integration", "Supported Integration Technologies", "Integration Tools"],
  ["workflow-technology", "Workflow Technology", "Integration Tools"],
  ["automated-configuration", "Automated Configuration Management", "Administration Tools"],
  ["data-management", "Data Management", "Administration Tools"],
  ["performance-monitor", "Performance Monitor", "Administration Tools"],
  ["security-administration", "Security Administration", "Administration Tools"],
  ["system-server-admin", "System and Server Administration", "Administration Tools"],
  ["usage-monitor", "Usage Monitor", "Administration Tools"],
  ["change-impact", "Change Impact Analyzer", "Lifecycle Management Tools"],
  ["change-assistant", "Change Assistant and Update Manager", "Lifecycle Management Tools"],
  ["lifecycle-management", "Lifecycle Management Guide", "Lifecycle Management Tools"],
  ["setup-manager", "Setup Manager", "Lifecycle Management Tools"],
  ["test-framework", "Test Framework", "Lifecycle Management Tools"],
].map(([id, title, category]) => ({ id, title, category }));

export const ORACLE_PEOPLETOOLS_LIBRARY_URL = "https://docs.oracle.com/cd/G41076_01/psft/index.html";
export const ORACLE_PEOPLETOOLS_HELP_URL = "https://www.oracle.com/pls/topic/lookup?ctx=en%2Fapplications%2Fpeoplesoft%2Fpeopletools&id=pt862help";
export const ORACLE_PEOPLETOOLS_UPDATES_URL = "https://docs.oracle.com/en/applications/peoplesoft/peopletools/index.html";
export const ORACLE_PEOPLETOOLS_PATCHES_URL = "https://support.oracle.com/knowledgefs/?docId=KA614";
export const ORACLE_DOCS_SNAPSHOT = snapshot.checked;

const normalizeTitle = (title: string) => title.toLowerCase().replace(/[’']/g, "");
const originalByTitle = new Map(originalDocs.map(doc => [normalizeTitle(doc.title), doc]));
export const ORACLE_CATALOGS = snapshot.catalogs.map(catalog => ({
  ...catalog,
  books: catalog.books.map(book => {
    const original = originalByTitle.get(normalizeTitle(book.title));
    return {
      ...book,
      title: original?.title ?? book.title,
      id: catalog.id === "tools-8.62" && original ? original.id : `${catalog.id}:${normalizeTitle(book.title).replace(/[^a-z0-9]+/g, "-")}`,
      category: catalog.family === "tools" ? original?.category || "General Information" : "Application manuals",
      release: catalog.family === "tools" ? `PeopleTools ${catalog.release}` : catalog.release,
    };
  }),
}));
export const ORACLE_DOCS: readonly OracleDoc[] = ORACLE_CATALOGS.find(catalog => catalog.id === "tools-8.62")!.books;
export const ALL_ORACLE_DOCS: readonly OracleDoc[] = ORACLE_CATALOGS.flatMap(catalog => catalog.books);

export function getOracleDocCatalog(toolsVersion = "8.62", family = "") {
  return family ? ORACLE_CATALOGS.find(catalog => catalog.family === family) : ORACLE_CATALOGS.find(catalog => catalog.id === `tools-${resolvePeopleToolsDocsVersion(toolsVersion).label}`);
}

export interface OraclePeopleToolsRelease {
  version: string;
  peopleBooksUrl: string;
  helpUrl: string;
}

/** Oracle's release aliases resolve the selected Tools release to its current hosted books. */
export const ORACLE_PEOPLETOOLS_RELEASES: readonly OraclePeopleToolsRelease[] =
  ["8.63", "8.62", "8.61", "8.60", "8.59", "8.58", "8.57", "8.56"].map((version) => {
    const minor = version.replace(".", "");
    const lookup = (id: string) => `https://www.oracle.com/pls/topic/lookup?ctx=en%2Fapplications%2Fpeoplesoft%2Fpeopletools&id=${id}`;
    return version === "8.63"
      ? { version, peopleBooksUrl: "https://docs.oracle.com/en/applications/peoplesoft/peopletools/8.63/index.html", helpUrl: lookup("pt863") }
      : { version, peopleBooksUrl: lookup(`pt${minor}pb`), helpUrl: lookup(`pt${minor}help`) };
  });

export function getOraclePeopleToolsRelease(input: string | null | undefined): OraclePeopleToolsRelease | undefined {
  const match = /^(8\.(?:56|57|58|59|60|61|62|63))(?:\.(\d+))?$/.exec((input ?? "").trim());
  return match ? ORACLE_PEOPLETOOLS_RELEASES.find((release) => release.version === match[1]) : undefined;
}

export function filterOracleDocs(query = "", category = "all", books: readonly OracleDoc[] = ORACLE_DOCS): readonly OracleDoc[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return books.filter((entry) => (category === "all" || entry.category === category) && terms.every((term) => `${entry.id} ${entry.title} ${entry.category} ${entry.release ?? "PeopleTools 8.62"}`.toLocaleLowerCase().includes(term)));
}

export type OracleDocsVersion = { supported: true; label: string; patch?: string } | { supported: false; label: string };
/** Match known PeopleTools release/build forms. Application releases and PUMs are intentionally not inferred. */
export function resolvePeopleToolsDocsVersion(input: string | null | undefined): OracleDocsVersion {
  const value = (input ?? "").trim();
  if (!value) return { supported: true, label: "8.62" };
  const match = /^(8\.(?:56|57|58|59|60|61|62|63))(?:\.(\d+))?$/.exec(value);
  return match ? { supported: true, label: match[1], ...(match[2] ? { patch: match[2] } : {}) } : { supported: false, label: value };
}

export type OracleApplicationFamily = "hcm" | "fscm" | "cs";
export function getManualFamilyLinks(): readonly { id: OracleApplicationFamily; title: string; url: string }[] {
  return [
    { id: "hcm", title: "Human Capital Management", url: "https://docs.oracle.com/en/applications/peoplesoft/human-capital-management/index.html" },
    { id: "fscm", title: "Financials and Supply Chain Management", url: "https://docs.oracle.com/en/applications/peoplesoft/financials-and-supply-chain-management/index.html" },
    { id: "cs", title: "Campus Solutions", url: "https://docs.oracle.com/en/applications/peoplesoft/campus-solutions/index.html" },
  ];
}
