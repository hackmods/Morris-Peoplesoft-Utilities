import { loadSettings, saveSettings } from "../../storage/settings";
import { FEATURE_LABELS } from "../../storage/feature-labels";
import type { YesNo } from "../../storage/schema";

const list = document.getElementById("toggle-list")!;
const status = document.getElementById("status")!;
const optionsLink = document.getElementById("open-options") as HTMLAnchorElement;

optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

document.getElementById("open-sidepanel")?.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "mpu-open-side-panel" }, (resp) => {
    status.textContent = resp?.ok ? "Side panel opened" : "Unable to open side panel";
  });
});
function broadcastRefresh(): void {
  chrome.runtime.sendMessage({ type: "mpu-refresh" }).catch(() => undefined);
}

async function init(): Promise<void> {
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
