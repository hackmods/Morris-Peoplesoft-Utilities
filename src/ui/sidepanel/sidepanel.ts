import { loadSettings, originAllowed } from "../../storage/settings";
import { buildComponentUrl, parsePsUrl } from "../../adapters/ps-page";
import { bindAgentLibrary } from "../../features/agent-references";

const favList = document.getElementById("fav-list")!;
const favEmpty = document.getElementById("fav-empty")!;
const favFilter = document.getElementById("fav-filter") as HTMLInputElement;
const pageInfo = document.getElementById("page-info")!;
const toast = document.getElementById("toast")!;
const agentsLink = document.getElementById("open-agents") as HTMLAnchorElement;
agentsLink.href = chrome.runtime.getURL("options.html#agents");

function say(msg: string): void {
  toast.textContent = msg;
}

async function renderFavorites(query = ""): Promise<void> {
  const settings = await loadSettings();
  const q = query.trim().toLowerCase();
  favList.replaceChildren();
  const items = settings.favorites.filter((f) => {
    if (!q) return true;
    return [f.Description, f.Menu, f.Component, f.Category, f.Notes || ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
  favEmpty.hidden = items.length > 0;
  for (const fav of items) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = fav.Description || `${fav.Menu}.${fav.Component}`;
    b.title = fav.Notes || `${fav.Menu}.${fav.Component}.${fav.Market}`;
    b.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !tab.id) {
        say("No active PeopleSoft tab");
        return;
      }
      const parsed = parsePsUrl(tab.url);
      const current = await loadSettings();
      const env = current.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
      if (parsed.kind === "unknown" || !parsed.portal || !parsed.node ||
          !originAllowed(tab.url, current) ||
          (env && current.environments[env.envId]?.active !== "Yes")) {
        say("Open an enabled PeopleSoft component or homepage first");
        return;
      }
      const url = buildComponentUrl({
        baseURL: parsed.baseURL,
        servlet: fav.Servlet,
        site: parsed.site,
        portal: parsed.portal,
        node: parsed.node,
        menu: fav.Menu,
        component: fav.Component,
        market: fav.Market,
        parameters: fav.Parameters || "",
      });
      if (!url) return;
      await chrome.tabs.update(tab.id, { url });
      say(`Opening ${fav.Menu}.${fav.Component}`);
    });
    li.appendChild(b);
    favList.appendChild(li);
  }
}

async function refreshPageInfo(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    pageInfo.textContent = "No active tab";
    return;
  }
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "mpu-page-info-snapshot" });
    pageInfo.textContent =
      (resp as { text?: string } | undefined)?.text ||
      "MPU did not respond — open a PeopleSoft page with the bar visible.";
  } catch {
    pageInfo.textContent =
      "Unable to reach MPU on this tab. Open a PeopleSoft psp/psc page (and check host allowlist).";
  }
}

document.getElementById("open-options")!.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

favFilter.addEventListener("input", () => {
  void renderFavorites(favFilter.value);
});

document.getElementById("refresh-pi")!.addEventListener("click", () => {
  void refreshPageInfo();
});

void renderFavorites();
bindAgentLibrary(document);
function showView(): void {
  const route = location.hash.slice(1);
  const agents = route === "agents";
  document.getElementById("panel-agents")!.hidden = !agents;
  document.getElementById("favorites-view")!.hidden = agents || route === "page-info-view";
  document.getElementById("page-info-view")!.hidden = agents || route === "favorites";
  for (const link of document.querySelectorAll<HTMLAnchorElement>('nav a')) {
    if (link.hash === location.hash) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}
window.addEventListener("hashchange", showView);
showView();
// Reading the active tab is an explicit Page Info action, including on the Agents route.
