/** Maintainer-only metadata refresh. Never run during builds or in the extension. */
import { JSDOM } from "jsdom";
import { writeFile } from "node:fs/promises";

const base = "https://docs.oracle.com/en/applications/peoplesoft/";
const sources = [
  ...["8.63", "8.62", "8.61", "8.60", "8.59", "8.58", "8.57", "8.56"].map(release => ({
    id: `tools-${release}`, family: "tools", release,
    url: release === "8.63" ? `${base}peopletools/8.63/index.html` : `https://www.oracle.com/pls/topic/lookup?ctx=en%2Fapplications%2Fpeoplesoft%2Fpeopletools&id=pt${release.replace(".", "")}pb`,
  })),
  { id: "hcm-9.2.055", family: "hcm", release: "9.2 · Update Image 55", url: `${base}human-capital-management/9.2.055/index.html` },
  { id: "fscm-9.2.057", family: "fscm", release: "9.2 · Update Image 57", url: `${base}financials-and-supply-chain-management/9.2.057/index.html` },
  { id: "cs-9.2.039", family: "cs", release: "9.2 · Update Image 39", url: `${base}campus-solutions/9.2.039/index.html` },
];

const catalogs = await Promise.all(sources.map(async source => {
  const response = await fetch(source.url, { signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`);
  const dom = new JSDOM(await response.text(), { url: response.url });
  const doc = dom.window.document;
  // Reject aliases silently redirected to a different Tools release.
  if (source.family === "tools" && !doc.title.includes(`PeopleTools ${source.release}`)) throw new Error(`${source.id}: unexpected title ${doc.title}`);
  if (source.family !== "tools" && response.url !== source.url) throw new Error(`${source.id}: unexpected redirect ${response.url}`);
  const books = [...doc.querySelectorAll('a[href]')].filter(a => /\.pdf$/i.test(new URL(a.href).pathname)).map(a => {
    const book = a.closest(".book");
    const title = (book?.querySelector(".h4")?.textContent || a.textContent || "").replace(/\s+/g, " ").trim();
    const url = new URL(a.href);
    if (url.origin !== "https://docs.oracle.com" || !title || title === "PDF") throw new Error(`${source.id}: invalid book`);
    return { title, pdfUrl: url.href };
  });
  if (books.length < 10) throw new Error(`${source.id}: only ${books.length} books`);
  dom.window.close();
  console.log(`${source.id}: ${books.length} PDFs — ${response.url}`);
  return { ...source, sourceUrl: response.url, books };
}));

await writeFile(new URL("../src/features/oracle-docs-catalog.json", import.meta.url), JSON.stringify({ checked: "2026-10-27", catalogs }, null, 2) + "\n");
