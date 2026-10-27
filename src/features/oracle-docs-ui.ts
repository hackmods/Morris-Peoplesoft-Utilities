import { getExtensionApi } from "../platform/browser";
import { ALL_ORACLE_DOCS, filterOracleDocs, getManualFamilyLinks, getOracleDocCatalog, getOraclePeopleToolsRelease, ORACLE_DOCS, ORACLE_DOCS_SNAPSHOT, ORACLE_PEOPLETOOLS_PATCHES_URL, ORACLE_PEOPLETOOLS_RELEASES, ORACLE_PEOPLETOOLS_UPDATES_URL, resolvePeopleToolsDocsVersion, type OracleDoc } from "./oracle-docs";

const FAVORITE_KEY = "mpuOracleDocsFavorite:";
const RECENT_KEY = "mpuOracleDocsRecent:";
const ids = new Set(ALL_ORACLE_DOCS.map((item) => item.id));

function externalLink(doc: Document, url: string, text: string): HTMLAnchorElement {
  const anchor = doc.createElement("a"); anchor.href = url; anchor.textContent = text;
  anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; anchor.referrerPolicy = "no-referrer";
  return anchor;
}

function safeRead(raw: unknown, prefix: string, type: "boolean" | "number"): Map<string, boolean | number> {
  const values = new Map<string, boolean | number>();
  if (!raw || typeof raw !== "object") return values;
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith(prefix)) continue;
    const id = key.slice(prefix.length);
    if (!ids.has(id)) continue;
    if (type === "boolean" && typeof value === "boolean") values.set(id, value);
    if (type === "number" && typeof value === "number" && Number.isFinite(value) && value > 0) values.set(id, value);
  }
  return values;
}

/** Build a local, searchable Oracle docs hub. Preferences store catalog IDs only. */
export function bindOracleDocs(doc: Document, container: HTMLElement, initialToolsRel?: string): () => void {
  const version = resolvePeopleToolsDocsVersion(initialToolsRel);
  container.classList.add("oracle-docs");
  const heading = doc.createElement("h2"); heading.textContent = "Oracle documentation";
  const intro = doc.createElement("p");
  intro.textContent = version.supported
    ? `PeopleTools ${version.label} documentation${version.patch ? ` (entered build ${version.label}.${version.patch})` : " (default)"}. Confirm patch-level applicability against your system.`
    : `The entered version “${version.label}” is not matched to this PeopleTools 8.62 catalog. Choose a supported release on Oracle's documentation index below.`;
  const versionNote = doc.createElement("p");
  versionNote.textContent = "PeopleTools tools version is separate from the application release and PUM image. This hub does not infer either one.";
  const source = doc.createElement("p");
  source.append("Official sources: ", externalLink(doc, ORACLE_PEOPLETOOLS_UPDATES_URL, "PeopleTools releases and documentation updates"), " · ", externalLink(doc, ORACLE_PEOPLETOOLS_PATCHES_URL, "PeopleTools patch downloads and build information (Oracle Support)"));
  const updateNote = doc.createElement("p"); updateNote.textContent = `PDF links checked against Oracle's indexes on ${ORACLE_DOCS_SNAPSHOT}. Select a Tools release or an application family to browse individual manuals. Application lists are labelled with their release and Update Image; they are independent of the Tools version. An entered build number does not pin a historical PDF build.`;

  const toolsLabel = doc.createElement("label"); toolsLabel.textContent = "PeopleTools version";
  const toolsInput = doc.createElement("input"); toolsInput.type = "text"; toolsInput.value = initialToolsRel?.trim() || "8.62"; toolsInput.placeholder = "8.62 or 8.62.06";
  toolsInput.maxLength = 30;
  toolsInput.autocomplete = "off";
  const releaseOptions = doc.createElement("datalist"); releaseOptions.id = "oracle-docs-tools-releases";
  for (const release of ORACLE_PEOPLETOOLS_RELEASES) { const option = doc.createElement("option"); option.value = release.version; releaseOptions.appendChild(option); }
  toolsInput.setAttribute("list", releaseOptions.id);
  toolsLabel.append(toolsInput, releaseOptions);
  const familyLabel = doc.createElement("label"); familyLabel.textContent = "Application manual family";
  const familySelect = doc.createElement("select");
  const blank = doc.createElement("option"); blank.value = ""; blank.textContent = "PeopleTools manuals"; familySelect.appendChild(blank);
  for (const family of getManualFamilyLinks()) { const option = doc.createElement("option"); option.value = family.id; option.textContent = family.title; familySelect.appendChild(option); }
  familyLabel.appendChild(familySelect);
  const familyLink = doc.createElement("p");
  familySelect.addEventListener("change", () => {
    familyLink.replaceChildren();
    const family = getManualFamilyLinks().find((entry) => entry.id === familySelect.value);
    if (family) familyLink.append(externalLink(doc, family.url, `Open ${family.title} documentation index`));
    category.value = "all";
    render();
  });

  const searchLabel = doc.createElement("label"); searchLabel.textContent = "Search manuals";
  const search = doc.createElement("input"); search.type = "search"; search.autocomplete = "off"; searchLabel.appendChild(search);
  const categoryLabel = doc.createElement("label"); categoryLabel.textContent = "Topic";
  const category = doc.createElement("select");
  const all = doc.createElement("option"); all.value = "all"; all.textContent = "All topics"; category.appendChild(all);
  for (const name of [...new Set(ORACLE_DOCS.map((entry) => entry.category))]) { const option = doc.createElement("option"); option.value = name; option.textContent = name; category.appendChild(option); }
  categoryLabel.appendChild(category);
  const view = doc.createElement("select"); view.setAttribute("aria-label", "Manual list");
  for (const [value, label] of [["all", "All manuals"], ["favorites", "Favorites"], ["recent", "Recently opened"]]) { const option = doc.createElement("option"); option.value = value; option.textContent = label; view.appendChild(option); }
  const status = doc.createElement("p"); status.setAttribute("aria-live", "polite");
  const list = doc.createElement("ul"); list.className = "oracle-docs-list";
  container.replaceChildren(heading, intro, versionNote, source, updateNote, toolsLabel, familyLabel, familyLink, searchLabel, categoryLabel, view, status, list);

  let favorites = new Map<string, boolean | number>();
  let recents = new Map<string, boolean | number>();
  let live = true;
  const touched = new Set<string>();
  const render = () => {
    if (!live) return;
    const focused = (doc.activeElement as HTMLElement | null)?.dataset.oracleFocus;
    const match = resolvePeopleToolsDocsVersion(toolsInput.value);
    const release = getOraclePeopleToolsRelease(toolsInput.value || "8.62");
    const catalog = getOracleDocCatalog(toolsInput.value || "8.62", familySelect.value);
    const family = getManualFamilyLinks().find(item => item.id === familySelect.value);
    toolsInput.disabled = Boolean(family);
    const selectedCategory = category.value;
    category.replaceChildren(all, ...[...new Set((catalog?.books ?? []).map(entry => entry.category))].map(name => {
      const option = doc.createElement("option"); option.value = name; option.textContent = name; return option;
    }));
    category.value = [...category.options].some(option => option.value === selectedCategory) ? selectedCategory : "all";
    intro.textContent = match.supported
      ? `PeopleTools ${match.label}${match.patch ? `.${match.patch}` : ""} selected. The release links open Oracle's current documentation; verify the exact patch against your system. No documents are fetched until you open a link.`
      : `The entered version “${match.label}” is not matched to this PeopleTools 8.62 catalog. Choose a supported release on Oracle's documentation index below.`;
    source.replaceChildren(externalLink(doc, ORACLE_PEOPLETOOLS_UPDATES_URL, "All PeopleTools versions and documentation updates"), " · ", externalLink(doc, ORACLE_PEOPLETOOLS_PATCHES_URL, "Patch downloads and build information (Oracle Support)"));
    if (family && catalog) {
      intro.textContent = `${family.title} ${catalog.release}. This application release/Update Image is independent of your PeopleTools version; confirm applicability against your system. No documents are fetched until you open a link.`;
      source.append(" · ", externalLink(doc, catalog.sourceUrl, `${family.title} ${catalog.release} PDF catalog`));
    } else if (release) {
      source.append(" · ", externalLink(doc, release.peopleBooksUrl, `PeopleTools ${release.version} PeopleBooks (PDF)`), " · ", externalLink(doc, release.helpUrl, `PeopleTools ${release.version} online help (HTML)`));
      if (catalog) source.append(" · ", externalLink(doc, catalog.sourceUrl, `Browse the ${release.version} PDF catalog`));
    }
    if (!catalog) { list.replaceChildren(); status.textContent = "Choose a supported release or open Oracle's index; MPU will not substitute a different version."; return; }
    const results = filterOracleDocs(search.value, category.value, catalog.books).filter((entry) => {
      if (view.value === "favorites") return favorites.get(entry.id) === true;
      if (view.value === "recent") return typeof recents.get(entry.id) === "number";
      return true;
    }).sort((a, b) => view.value === "recent" ? Number(recents.get(b.id) || 0) - Number(recents.get(a.id) || 0) : a.title.localeCompare(b.title));
    status.textContent = results.length ? `${results.length} manual${results.length === 1 ? "" : "s"} · ${family?.title ?? "PeopleTools"} ${catalog.release}` : `No manuals match this search in ${family?.title ?? "PeopleTools"} ${catalog.release}.`;
    list.replaceChildren(...results.map((entry) => renderEntry(entry)));
    if (focused) (Array.from(list.querySelectorAll<HTMLElement>("[data-oracle-focus]")).find((item) => item.dataset.oracleFocus === focused) || view).focus();
  };
  const renderEntry = (entry: OracleDoc): HTMLLIElement => {
    const row = doc.createElement("li"); row.className = "oracle-docs-item";
    const title = externalLink(doc, entry.pdfUrl, entry.title);
    title.dataset.oracleFocus = `${entry.id}:open`;
    const favorite = doc.createElement("button"); favorite.type = "button"; favorite.className = "oracle-docs-favorite";
    favorite.textContent = favorites.get(entry.id) === true ? "Remove favorite" : "Add favorite";
    favorite.setAttribute("aria-pressed", String(favorites.get(entry.id) === true));
    favorite.dataset.oracleFocus = `${entry.id}:favorite`;
    favorite.setAttribute("aria-label", `${favorite.textContent}: ${entry.title}`);
    let savingFavorite = false;
    favorite.addEventListener("click", () => {
      if (savingFavorite) return;
      savingFavorite = true;
      favorite.setAttribute("aria-disabled", "true");
      const next = favorites.get(entry.id) !== true;
      void getExtensionApi().storage.local.set({ [`${FAVORITE_KEY}${entry.id}`]: next }).then(() => {
        if (!live) return; favorites.set(entry.id, next); render();
      }).catch(() => { savingFavorite = false; favorite.removeAttribute("aria-disabled"); status.textContent = "Unable to save the manual favorite."; });
    });
    title.addEventListener("click", () => {
      void getExtensionApi().storage.local.set({ [`${RECENT_KEY}${entry.id}`]: Date.now() }).then(() => {
        if (!live) return; recents.set(entry.id, Date.now()); render();
      }).catch(() => { /* The manual still opens if recent-history storage is unavailable. */ });
    });
    const topic = doc.createElement("span"); topic.className = "oracle-docs-category"; topic.textContent = `${entry.release} · ${entry.category}`;
    row.append(title, topic, favorite); return row;
  };
  search.addEventListener("input", render); category.addEventListener("change", render); view.addEventListener("change", render);
  toolsInput.addEventListener("input", render);

  const onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== "local") return;
    if (!Object.keys(changes).some((key) => (key.startsWith(FAVORITE_KEY) && ids.has(key.slice(FAVORITE_KEY.length))) || (key.startsWith(RECENT_KEY) && ids.has(key.slice(RECENT_KEY.length))))) return;
    const nextFavorites = new Map(favorites); const nextRecents = new Map(recents);
    for (const [key, change] of Object.entries(changes)) {
      touched.add(key);
      if (key.startsWith(FAVORITE_KEY)) { const id = key.slice(FAVORITE_KEY.length); if (ids.has(id)) { if (change.newValue === true || change.newValue === false) nextFavorites.set(id, change.newValue); else nextFavorites.delete(id); } }
      if (key.startsWith(RECENT_KEY)) { const id = key.slice(RECENT_KEY.length); if (ids.has(id)) { if (typeof change.newValue === "number" && Number.isFinite(change.newValue) && change.newValue > 0) nextRecents.set(id, change.newValue); else nextRecents.delete(id); } }
    }
    favorites = nextFavorites; recents = nextRecents; render();
  };
  getExtensionApi().storage.onChanged.addListener(onStorageChanged);
  render();
  void getExtensionApi().storage.local.get(ALL_ORACLE_DOCS.flatMap((entry) => [FAVORITE_KEY + entry.id, RECENT_KEY + entry.id])).then((raw) => {
    if (!live) return;
    const loadedFavorites = safeRead(raw, FAVORITE_KEY, "boolean");
    const loadedRecents = safeRead(raw, RECENT_KEY, "number");
    for (const [id, value] of loadedFavorites) if (!touched.has(FAVORITE_KEY + id)) favorites.set(id, value);
    for (const [id, value] of loadedRecents) if (!touched.has(RECENT_KEY + id)) recents.set(id, value);
    render();
  }).catch(() => { if (live) status.textContent = "Manuals are available, but saved favorites and recent history could not be loaded."; });
  const cleanup = () => { if (!live) return; live = false; getExtensionApi().storage.onChanged.removeListener(onStorageChanged); };
  doc.defaultView?.addEventListener("pagehide", cleanup, { once: true });
  return cleanup;
}
