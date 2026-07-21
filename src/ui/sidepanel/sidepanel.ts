import { loadSettings } from "../../storage/settings";
import { buildComponentUrl } from "../../adapters/ps-page";

const favList = document.getElementById("fav-list")!;
const favEmpty = document.getElementById("fav-empty")!;
const favFilter = document.getElementById("fav-filter") as HTMLInputElement;
const pageInfo = document.getElementById("page-info")!;
const toast = document.getElementById("toast")!;

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
      let portal = "EMPLOYEE";
      let node = "HRMS";
      let site = "ps";
      let origin: string;
      try {
        const u = new URL(tab.url);
        origin = u.origin;
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts.length >= 4) {
          site = parts[1] || site;
          portal = parts[2] || portal;
          node = parts[3] || node;
        }
      } catch {
        say("Active tab is not a PeopleSoft tab URL");
        return;
      }
      const url = buildComponentUrl({
        baseURL: origin,
        servlet: fav.Servlet,
        site,
        portal,
        node,
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
void refreshPageInfo();
