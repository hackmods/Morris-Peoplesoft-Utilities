import { getExtensionApi, openSidebar } from "../../platform/browser";
import { loadSettings, saveSettings, SettingsSaveError } from "../../storage/settings";
import { FEATURE_LABELS } from "../../storage/feature-labels";
import type { YesNo } from "../../storage/schema";
import { parsePsUrl } from "../../adapters/ps-page";

const list = document.getElementById("toggle-list")!;
const status = document.getElementById("status")!;
window.addEventListener("unhandledrejection", (event) => {
  if (event.reason instanceof SettingsSaveError) { event.preventDefault(); status.textContent = event.reason.message; }
});
const optionsLink = document.getElementById("open-options") as HTMLAnchorElement;
const agentsLink = document.getElementById("open-agents") as HTMLAnchorElement;
agentsLink.href = getExtensionApi().runtime.getURL("options.html#agents");
agentsLink.addEventListener("click", (event) => {
  event.preventDefault();
  const fallback = (): void => {
    void getExtensionApi().tabs.create({ url: getExtensionApi().runtime.getURL("options.html#agents") })
      .catch(() => { status.textContent = "Unable to open the Agents library"; });
  };
  if (sidePanelTabId === undefined) {
    fallback(); return;
  }
  try {
    void openSidebar(sidePanelTabId, "sidepanel.html#agents").then(() => window.close()).catch(fallback);
  } catch { fallback(); }
});

optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  getExtensionApi().runtime.openOptionsPage();
});

let sidePanelTabId: number | undefined;
document.getElementById("open-sidepanel")?.addEventListener("click", () => {
  if (sidePanelTabId === undefined) { status.textContent = "No active tab"; return; }
  // Call directly within the click; asynchronous messaging can lose user activation.
  void openSidebar(sidePanelTabId).then(
    () => { window.close(); },
    () => { status.textContent = "Unable to open side panel"; },
  );
});
function broadcastRefresh(): void {
  getExtensionApi().runtime.sendMessage({ type: "mpu-refresh" }).catch(() => undefined);
}

async function init(): Promise<void> {
  const [tab] = await getExtensionApi().tabs.query({ active: true, currentWindow: true });
  sidePanelTabId = tab?.id;
  const activation = document.getElementById("activation-status")!;
  if (!tab?.url || parsePsUrl(tab.url).kind === "unknown") {
    activation.textContent = "Inactive on this tab — no supported PeopleSoft URL detected.";
  } else if (tab.id !== undefined) {
    try {
      const reply = await getExtensionApi().tabs.sendMessage(tab.id, { type: "mpu-activation-status" }) as { active?: boolean; loginOnly?: boolean } | undefined;
      activation.textContent = reply?.active === true ? "Active — MPU is running on this PeopleSoft page."
        : reply?.loginOnly === true ? "Login page — limited MPU display; page helpers are inactive."
        : "PeopleSoft URL detected — MPU page helpers are inactive.";
    } catch { activation.textContent = "PeopleSoft URL detected — MPU has not responded. Check site access, allowlist, or reload the page."; }
  }
  const settings = await loadSettings();
  list.replaceChildren();

  for (const t of FEATURE_LABELS) {
    const row = document.createElement("div");
    row.className = "label-row";
    const lab = document.createElement("label");
    lab.htmlFor = t.key;
    lab.textContent = t.label;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = t.key;
    input.checked = settings.features[t.key] === "Yes";
    input.addEventListener("change", async () => {
      const next = await loadSettings();
      next.features[t.key] = (input.checked ? "Yes" : "No") as YesNo;
      await saveSettings(next);
      status.textContent = `${t.label} ${input.checked ? "enabled" : "disabled"}`;
      broadcastRefresh();
    });
    row.append(lab, input);
    list.appendChild(row);
  }
}

void init();
