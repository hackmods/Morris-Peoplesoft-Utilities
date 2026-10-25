export type OracleDocCategory = "General Information" | "Development Tools" | "Reporting and Analysis Tools" | "Integration Tools" | "Administration Tools" | "Lifecycle Management Tools";
export interface OracleDoc { id: string; title: string; category: OracleDocCategory; pdfUrl: string; }

const ROOT = "https://docs.oracle.com/cd/G41076_01/psft/";
const pdf = (file: string) => `${ROOT}pdf/${file}-b112025.pdf`;
/** Direct links verified against the Oracle PeopleTools 8.62 PeopleBooks index (snapshot November 2025). */
export const ORACLE_DOCS: readonly OracleDoc[] = [
  ["accessibility-guide", "Accessibility Guide", "General Information", "pt862tacs"],
  ["applications-users-guide", "Applications User’s Guide", "General Information", "pt862tupa"],
  ["getting-started", "Getting Started with PeopleTools", "General Information", "pt862tgst"],
  ["application-designer", "Application Designer Developer’s Guide", "Development Tools", "pt862tapd"],
  ["application-engine", "Application Engine", "Development Tools", "pt862tape"],
  ["data-distribution", "Data Distribution Framework", "Development Tools", "pt862tmlf"],
  ["documents-technology", "Documents Technology", "Development Tools", "pt862tdoc"],
  ["fluid-ui", "Fluid User Interface Developer’s Guide", "Development Tools", "pt862tflu"],
  ["global-technology", "Global Technology", "Development Tools", "pt862tgbl"],
  ["optimization-framework", "Optimization Framework", "Development Tools", "pt862topt"],
  ["peoplecode-api", "PeopleCode API Reference", "Development Tools", "pt862tpcr"],
  ["portal-technology", "Portal Technology", "Development Tools", "pt862tprt"],
  ["peoplecode-developer", "PeopleCode Developer’s Guide", "Development Tools", "pt862tpcd"],
  ["peoplecode-language", "PeopleCode Language Reference", "Development Tools", "pt862tpcl"],
  ["search-technology", "Search Technology", "Development Tools", "pt862tpst"],
  ["analytic-calculation-engine", "Analytic Calculation Engine", "Reporting and Analysis Tools", "pt862tace"],
  ["bi-publisher", "BI Publisher for PeopleSoft", "Reporting and Analysis Tools", "pt862txml"],
  ["pivot-grid", "Pivot Grid", "Reporting and Analysis Tools", "pt862tpvg"],
  ["process-scheduler", "Process Scheduler", "Reporting and Analysis Tools", "pt862tprs"],
  ["ps-nvision", "PS/nVision", "Reporting and Analysis Tools", "pt862tnvs"],
  ["query", "Query", "Reporting and Analysis Tools", "pt862tpsq"],
  ["reporting-web-services", "Reporting Web Services", "Reporting and Analysis Tools", "pt862trws"],
  ["sqr-developers", "SQR for PeopleSoft Developers", "Reporting and Analysis Tools", "pt862tsqr"],
  ["sqr-language", "SQR Language Reference for PeopleSoft", "Reporting and Analysis Tools", "pt862tsql"],
  ["tree-manager", "Tree Manager", "Reporting and Analysis Tools", "pt862ttrm"],
  ["component-interfaces", "Component Interfaces", "Integration Tools", "pt862tcpi"],
  ["feed-publishing", "Feed Publishing Framework", "Integration Tools", "pt862tfee"],
  ["integration-broker", "Integration Broker", "Integration Tools", "pt862tibr"],
  ["integration-broker-admin", "Integration Broker Administration", "Integration Tools", "pt862tiba"],
  ["integration-broker-monitor", "Integration Broker Service Operations Monitor", "Integration Tools", "pt862tibm"],
  ["integration-broker-testing", "Integration Broker Testing Utilities and Tools", "Integration Tools", "pt862tibt"],
  ["multichannel-framework", "MultiChannel Framework", "Integration Tools", "pt862tmcf"],
  ["supported-integration", "Supported Integration Technologies", "Integration Tools", "pt862tsis"],
  ["workflow-technology", "Workflow Technology", "Integration Tools", "pt862twfl"],
  ["automated-configuration", "Automated Configuration Management", "Administration Tools", "pt862tacm"],
  ["data-management", "Data Management", "Administration Tools", "pt862tadm"],
  ["performance-monitor", "Performance Monitor", "Administration Tools", "pt862tpfm"],
  ["security-administration", "Security Administration", "Administration Tools", "pt862tsec"],
  ["system-server-admin", "System and Server Administration", "Administration Tools", "pt862tsvt"],
  ["usage-monitor", "Usage Monitor", "Administration Tools", "pt862tusm"],
  ["change-impact", "Change Impact Analyzer", "Lifecycle Management Tools", "pt862tcia"],
  ["change-assistant", "Change Assistant and Update Manager", "Lifecycle Management Tools", "pt862tswu"],
  ["lifecycle-management", "Lifecycle Management Guide", "Lifecycle Management Tools", "pt862tlcm"],
  ["setup-manager", "Setup Manager", "Lifecycle Management Tools", "pt862tsum"],
  ["test-framework", "Test Framework", "Lifecycle Management Tools", "pt862tptf"],
].map(([id, title, category, file]) => ({ id, title, category: category as OracleDocCategory, pdfUrl: pdf(file) }));

export const ORACLE_PEOPLETOOLS_LIBRARY_URL = "https://docs.oracle.com/cd/G41076_01/psft/index.html";
export const ORACLE_PEOPLETOOLS_HELP_URL = "https://www.oracle.com/pls/topic/lookup?ctx=en%2Fapplications%2Fpeoplesoft%2Fpeopletools&id=pt862help";
export const ORACLE_PEOPLETOOLS_UPDATES_URL = "https://docs.oracle.com/en/applications/peoplesoft/peopletools/index.html";
export const ORACLE_PEOPLETOOLS_PATCHES_URL = "https://support.oracle.com/knowledgefs/?docId=KA614";
export const ORACLE_DOCS_SNAPSHOT = "November 2025";

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

export function filterOracleDocs(query = "", category = "all"): readonly OracleDoc[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return ORACLE_DOCS.filter((entry) => (category === "all" || entry.category === category) && terms.every((term) => `${entry.id} ${entry.title} ${entry.category} PeopleTools 8.62`.toLocaleLowerCase().includes(term)));
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
