import { loadSettings, saveSettings } from "../../storage/settings";
import { FEATURE_LABELS, FEATURE_TOGGLE_GROUPS } from "../../storage/feature-labels";
import type { FeatureToggleKey } from "../../storage/feature-labels";
import { removeEnvironmentAt } from "../../storage/env-map";
import {
  favoritesToCsv,
  isSettingsBackup,
  parseFavoritesCsv,
} from "../../storage/favorites-io";
import {
  DEFAULT_FEATURE_UI_SCOPES,
  DEFAULT_TRACE,
  FIELD_COPY_FORMATS,
  type CustomizationWatch,
  type FeatureUiScope,
  type FeatureUiScopes,
  type FieldCopyFormat,
  type MpuSettings,
  type TraceSettings,
  type YesNo,
} from "../../storage/schema";
import {
  TRACE_PRESET_META,
  applyTracePreset,
  summarizeActiveTraceFlags,
  type TracePresetId,
} from "../../features/trace-presets";
import { upsertWatch } from "../../features/upgrade-watch";

const toast = document.getElementById("toast")!;
let toastTimer = 0;

function say(msg: string): void {
  toast.textContent = msg;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2800);
}

function broadcast(): void {
  chrome.runtime.sendMessage({ type: "mpu-refresh" }).catch(() => undefined);
}

const SCOPE_LABELS: Array<{ key: keyof FeatureUiScopes; label: string }> = [
  { key: "recFieldInfoOption", label: "Field Inspector UI scope" },
  { key: "advSearchOption", label: "Advanced Search UI scope" },
  { key: "correctHistoryOption", label: "Correct History UI scope" },
];

const TRACE_LABELS: Array<{ key: keyof TraceSettings; label: string }> = [
  { key: "PC0004", label: "PC: Assignments to variables" },
  { key: "PC0064", label: "PC: Start of programs" },
  { key: "PC0001", label: "PC: Evaluator instructions" },
  { key: "PC0002", label: "PC: List evaluator program" },
  { key: "PC0008", label: "PC: Fetch values" },
  { key: "PC0016", label: "PC: Show stack" },
  { key: "PC0128", label: "PC: External function calls" },
  { key: "PC0256", label: "PC: Internal function calls" },
  { key: "PC0512", label: "PC: Parameter values" },
  { key: "PC1024", label: "PC: Return parameter values" },
  { key: "PC2048", label: "PC: Show each" },
  { key: "SQL0001", label: "SQL: Statement" },
  { key: "SQL0002", label: "SQL: Bind" },
  { key: "SQL0004", label: "SQL: Cursor" },
  { key: "SQL0008", label: "SQL: Fetch" },
  { key: "SQL0016", label: "SQL: API" },
  { key: "SQL0032", label: "SQL: Set select buffer" },
  { key: "SQL0064", label: "SQL: Database level" },
  { key: "SQL4096", label: "SQL: Manager level" },
];

function wireTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>(".tab")];
  const panels = [...document.querySelectorAll<HTMLElement>(".panel")];

  const selectTab = (tab: HTMLButtonElement): void => {
    const id = tab.dataset.tab;
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    tabs.forEach((t) => {
      t.tabIndex = t === tab ? 0 : -1;
    });
    panels.forEach((p) => {
      const on = p.dataset.panel === id;
      p.hidden = !on;
      p.classList.toggle("hidden", !on);
    });
    tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (e) => {
      let next = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = (index + 1) % tabs.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = (index - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        next = 0;
      } else if (e.key === "End") {
        next = tabs.length - 1;
      }
      if (next < 0) return;
      e.preventDefault();
      selectTab(tabs[next]);
    });
  });
}

function renderFeatures(settings: MpuSettings): void {
  const root = document.getElementById("feature-toggles")!;
  root.replaceChildren();

  for (const group of FEATURE_TOGGLE_GROUPS) {
    const section = document.createElement("section");
    section.className = "feature-group";
    section.dataset.tone = group.tone;
    section.setAttribute("aria-labelledby", `feature-group-${group.id}`);

    const head = document.createElement("div");
    head.className = "feature-group-head";
    const title = document.createElement("h3");
    title.className = "feature-group-title";
    title.id = `feature-group-${group.id}`;
    title.textContent = group.title;
    const desc = document.createElement("p");
    desc.className = "feature-group-desc";
    desc.textContent = group.description;
    head.append(title, desc);

    const body = document.createElement("div");
    body.className = "feature-group-body";

    for (const item of group.items) {
      const row = document.createElement("label");
      row.className = "toggle-row";
      row.htmlFor = item.key;

      const copy = document.createElement("span");
      copy.className = "toggle-copy";
      const name = document.createElement("span");
      name.className = "toggle-title";
      name.textContent = item.label;
      copy.appendChild(name);
      if (item.hint) {
        const hint = document.createElement("span");
        hint.className = "toggle-hint";
        hint.textContent = item.hint;
        copy.appendChild(hint);
      }

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = item.key;
      input.className = "toggle-input";
      input.checked = settings.features[item.key] === "Yes";

      row.append(copy, input);
      body.appendChild(row);
    }

    section.append(head, body);
    root.appendChild(section);
  }

  (document.getElementById("quietEnvPrompt") as HTMLInputElement).checked =
    settings.quietEnvPrompt === "Yes";

  const fmtSel = document.getElementById("fieldCopyFormat") as HTMLSelectElement | null;
  if (fmtSel) {
    fmtSel.replaceChildren();
    for (const f of FIELD_COPY_FORMATS) {
      const o = document.createElement("option");
      o.value = f.id;
      o.textContent = `${f.label} — e.g. ${f.example}`;
      if ((settings.fieldCopyFormat || "record.field") === f.id) o.selected = true;
      fmtSel.appendChild(o);
    }
  }

  const onboard = document.getElementById("onboarding");
  if (onboard) {
    onboard.hidden = settings.showOnboarding !== "Yes";
  }

  const scopesRoot = document.getElementById("feature-ui-scopes");
  if (scopesRoot) {
    scopesRoot.replaceChildren();
    const scopes = { ...DEFAULT_FEATURE_UI_SCOPES, ...settings.featureUiScopes };
    for (const f of SCOPE_LABELS) {
      const label = document.createElement("label");
      label.className = "pref-field";
      label.htmlFor = `scope-${f.key}`;
      const span = document.createElement("span");
      span.className = "pref-field-label";
      span.textContent = f.label;
      const select = document.createElement("select");
      select.id = `scope-${f.key}`;
      select.setAttribute("aria-label", f.label);
      for (const opt of [
        { value: "both", text: "Classic + Fluid" },
        { value: "classic", text: "Classic only" },
        { value: "fluid", text: "Fluid only" },
      ]) {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.text;
        if (scopes[f.key] === opt.value) o.selected = true;
        select.appendChild(o);
      }
      label.append(span, select);
      scopesRoot.appendChild(label);
    }
  }
}

function renderTrace(settings: MpuSettings): void {
  const root = document.getElementById("trace-flags")!;
  root.replaceChildren();
  const t = { ...DEFAULT_TRACE, ...settings.traceSettings };
  for (const f of TRACE_LABELS) {
    const label = document.createElement("label");
    label.className = "row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = `trace-${f.key}`;
    input.checked = t[f.key] === "Yes";
    input.addEventListener("change", () => refreshTraceSummaryFromDom());
    label.append(input, document.createTextNode(f.label));
    root.appendChild(label);
  }

  const presets = document.getElementById("trace-presets")!;
  presets.replaceChildren();
  for (const p of TRACE_PRESET_META) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = p.label;
    b.title = p.hint;
    b.setAttribute("aria-label", `Apply ${p.label} trace preset: ${p.hint}`);
    b.addEventListener("click", () => applyPresetToDom(p.id));
    presets.appendChild(b);
  }
  refreshTraceSummaryFromDom();
}

function readTraceFromDom(): TraceSettings {
  const next = { ...DEFAULT_TRACE };
  for (const f of TRACE_LABELS) {
    const el = document.getElementById(`trace-${f.key}`) as HTMLInputElement | null;
    next[f.key] = (el?.checked ? "Yes" : "No") as YesNo;
  }
  return next;
}

function applyPresetToDom(id: TracePresetId): void {
  const preset = applyTracePreset(id);
  for (const f of TRACE_LABELS) {
    const el = document.getElementById(`trace-${f.key}`) as HTMLInputElement | null;
    if (el) el.checked = preset[f.key] === "Yes";
  }
  refreshTraceSummaryFromDom();
  say(`Applied ${id} preset — Save to keep`);
}

function refreshTraceSummaryFromDom(): void {
  const el = document.getElementById("trace-summary");
  if (!el) return;
  el.textContent = `Active flags: ${summarizeActiveTraceFlags(readTraceFromDom())}`;
}

function emptyState(text: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.className = "empty-state";
  p.textContent = text;
  return p;
}

function isCustomizationWatch(value: unknown): value is CustomizationWatch {
  if (!value || typeof value !== "object") return false;
  const w = value as CustomizationWatch;
  return (
    typeof w.id === "string" &&
    typeof w.menu === "string" &&
    typeof w.component === "string" &&
    typeof w.market === "string" &&
    typeof w.capturedAt === "number" &&
    w.baseline !== null &&
    typeof w.baseline === "object" &&
    Array.isArray((w.baseline as CustomizationWatch["baseline"]).fieldIds)
  );
}

function parseCustomizationWatchesImport(data: unknown): CustomizationWatch[] | null {
  if (Array.isArray(data)) {
    return data.every(isCustomizationWatch) ? data : null;
  }
  if (data && typeof data === "object" && Array.isArray((data as { customizationWatches?: unknown }).customizationWatches)) {
    const list = (data as { customizationWatches: unknown[] }).customizationWatches;
    return list.every(isCustomizationWatch) ? (list as CustomizationWatch[]) : null;
  }
  return null;
}

function mergeCustomizationWatches(
  current: CustomizationWatch[],
  imported: CustomizationWatch[],
  replace: boolean,
): CustomizationWatch[] {
  if (replace) return imported.slice(0, 50);
  let next = [...current];
  for (const watch of imported) {
    next = upsertWatch(next, watch);
  }
  return next;
}

function formatWatchDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

function renderUpgradeWatches(settings: MpuSettings): void {
  const tbody = document.querySelector("#watch-table tbody")!;
  const empty = document.getElementById("watch-empty")!;
  tbody.replaceChildren();
  if (!settings.customizationWatches.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  settings.customizationWatches.forEach((watch, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td></td><td></td><td></td><td></td><td></td><td></td>`;
    const cells = tr.querySelectorAll("td");
    cells[0].textContent = watch.label;
    cells[1].textContent = `${watch.menu}.${watch.component}.${watch.market}`;
    cells[2].textContent = formatWatchDate(watch.capturedAt);
    cells[3].textContent = watch.baseline.toolsRel || "—";
    cells[4].textContent = String(watch.baseline.fieldIds.length);
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      const s = await loadSettings();
      s.customizationWatches.splice(index, 1);
      await saveSettings(s);
      renderUpgradeWatches(s);
      broadcast();
      say("Watch deleted");
    });
    cells[5].appendChild(del);
    tbody.appendChild(tr);
  });
}

function renderFavorites(settings: MpuSettings): void {
  const tbody = document.querySelector("#fav-table tbody")!;
  const empty = document.getElementById("fav-empty")!;
  tbody.replaceChildren();
  if (!settings.favorites.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  settings.favorites.forEach((fav, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td></td><td></td><td></td><td></td><td></td><td></td>`;
    const cells = tr.querySelectorAll("td");
    cells[0].textContent = fav.Description;
    cells[1].textContent = fav.Menu;
    cells[2].textContent = fav.Component;
    cells[3].textContent = fav.Market;
    const notesInput = document.createElement("input");
    notesInput.value = fav.Notes || "";
    notesInput.setAttribute("aria-label", `Notes for ${fav.Description || fav.Component}`);
    notesInput.addEventListener("change", async () => {
      const s = await loadSettings();
      if (!s.favorites[index]) return;
      const notes = notesInput.value.trim();
      if (notes) s.favorites[index].Notes = notes;
      else delete s.favorites[index].Notes;
      await saveSettings(s);
      broadcast();
      say("Notes saved");
    });
    cells[4].appendChild(notesInput);
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      const s = await loadSettings();
      s.favorites.splice(index, 1);
      await saveSettings(s);
      renderFavorites(s);
      broadcast();
      say("Favorite deleted");
    });
    cells[5].appendChild(del);
    tbody.appendChild(tr);
  });
}

function renderEnvs(settings: MpuSettings): void {
  const root = document.getElementById("env-list")!;
  root.replaceChildren();
  if (!settings.environments.length) {
    root.appendChild(
      emptyState("No environments yet — add one here, or name a site when the bar first loads."),
    );
    return;
  }
  settings.environments.forEach((env, index) => {
    const card = document.createElement("div");
    card.className = "env-card";
    const name = document.createElement("input");
    name.value = env.label;
    name.setAttribute("aria-label", `Environment ${index + 1} name`);
    const active = document.createElement("input");
    active.type = "checkbox";
    active.checked = env.active === "Yes";
    const color = document.createElement("input");
    color.type = "color";
    color.value = env.color || "#b8922a";
    color.setAttribute("aria-label", "Accent color");
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    save.addEventListener("click", async () => {
      const s = await loadSettings();
      s.environments[index] = {
        ...s.environments[index],
        label: name.value.trim() || s.environments[index].label,
        active: active.checked ? "Yes" : "No",
        color: color.value,
      };
      await saveSettings(s);
      broadcast();
      say("Environment saved");
    });
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      const s = removeEnvironmentAt(await loadSettings(), index);
      await saveSettings(s);
      renderEnvs(s);
      broadcast();
      say("Environment deleted");
    });
    const activeLab = document.createElement("label");
    activeLab.append(active, document.createTextNode(" Active on this browser"));
    card.append(name, activeLab, color, save, del);
    root.appendChild(card);
  });
}

function renderAllowlist(settings: MpuSettings): void {
  (document.getElementById("hostAllowlistEnabled") as HTMLInputElement).checked =
    settings.features.hostAllowlistEnabled === "Yes";
  (document.getElementById("hostAllowlist") as HTMLTextAreaElement).value =
    settings.hostAllowlist.join("\n");
}

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function init(): Promise<void> {
  wireTabs();
  const settings = await loadSettings();
  renderFeatures(settings);
  renderTrace(settings);
  renderFavorites(settings);
  renderUpgradeWatches(settings);
  renderEnvs(settings);
  renderAllowlist(settings);

  document.getElementById("save-features")!.addEventListener("click", async () => {
    const s = await loadSettings();
    for (const f of FEATURE_LABELS) {
      const el = document.getElementById(f.key) as HTMLInputElement;
      s.features[f.key as FeatureToggleKey] = (el.checked ? "Yes" : "No") as YesNo;
    }
    s.quietEnvPrompt = (document.getElementById("quietEnvPrompt") as HTMLInputElement).checked
      ? "Yes"
      : "No";
    const fmt = (document.getElementById("fieldCopyFormat") as HTMLSelectElement | null)?.value as
      | FieldCopyFormat
      | undefined;
    s.fieldCopyFormat =
      fmt === "ampersand" || fmt === "getfield" || fmt === "record.field" ? fmt : "record.field";
    const scopes = { ...DEFAULT_FEATURE_UI_SCOPES };
    for (const f of SCOPE_LABELS) {
      const el = document.getElementById(`scope-${f.key}`) as HTMLSelectElement | null;
      const v = (el?.value || "both") as FeatureUiScope;
      scopes[f.key] = v === "classic" || v === "fluid" || v === "both" ? v : "both";
    }
    s.featureUiScopes = scopes;
    await saveSettings(s);
    broadcast();
    say("Features saved");
  });

  document.getElementById("dismiss-onboarding")?.addEventListener("click", async () => {
    const s = await loadSettings();
    s.showOnboarding = "No";
    await saveSettings(s);
    const onboard = document.getElementById("onboarding");
    if (onboard) onboard.hidden = true;
    say("Onboarding dismissed");
  });

  document.getElementById("save-trace")!.addEventListener("click", async () => {
    const s = await loadSettings();
    s.traceSettings = readTraceFromDom();
    await saveSettings(s);
    say("Trace settings saved");
  });

  document.getElementById("save-allowlist")!.addEventListener("click", async () => {
    const s = await loadSettings();
    s.features.hostAllowlistEnabled = (
      document.getElementById("hostAllowlistEnabled") as HTMLInputElement
    ).checked
      ? "Yes"
      : "No";
    s.hostAllowlist = (document.getElementById("hostAllowlist") as HTMLTextAreaElement).value
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    await saveSettings(s);
    broadcast();
    say("Allowlist saved");
  });

  document.getElementById("add-env")!.addEventListener("click", async () => {
    const s = await loadSettings();
    s.environments.push({
      label: `Env ${s.environments.length + 1}`,
      active: "Yes",
      trcProfRunning: "No",
    });
    await saveSettings(s);
    renderEnvs(s);
    say("Environment added");
  });

  document.getElementById("export-fav")!.addEventListener("click", async () => {
    const ok = window.confirm(
      "Favorites export may include business keys in Parameters, descriptions, or Notes. Continue?",
    );
    if (!ok) return;
    const s = await loadSettings();
    download("mpu-favorites.csv", favoritesToCsv(s.favorites), "text/csv");
    say("Favorites exported");
  });

  document.getElementById("import-fav")!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseFavoritesCsv(text);
      if (!imported.length) {
        say("No favorites found in CSV");
        return;
      }
      const replace = (document.getElementById("import-replace") as HTMLInputElement | null)?.checked;
      const s = await loadSettings();
      s.favorites = replace ? imported : [...s.favorites, ...imported];
      await saveSettings(s);
      renderFavorites(s);
      broadcast();
      say(
        replace
          ? `Replaced with ${imported.length} favorite(s)`
          : `Imported ${imported.length} favorite(s)`,
      );
    } catch {
      say("Could not import CSV — check the file format");
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  });

  document.getElementById("export-watches")!.addEventListener("click", async () => {
    const s = await loadSettings();
    download(
      "mpu-customization-watches.json",
      JSON.stringify(s.customizationWatches, null, 2),
      "application/json",
    );
    say("Watches exported");
  });

  document.getElementById("import-watches")!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const imported = parseCustomizationWatchesImport(parsed);
      if (!imported?.length) {
        say("No valid watches found in JSON");
        return;
      }
      const replace = (document.getElementById("import-watches-replace") as HTMLInputElement | null)
        ?.checked;
      const s = await loadSettings();
      s.customizationWatches = mergeCustomizationWatches(
        s.customizationWatches,
        imported,
        Boolean(replace),
      );
      await saveSettings(s);
      renderUpgradeWatches(s);
      broadcast();
      say(
        replace
          ? `Replaced with ${imported.length} watch(es)`
          : `Imported ${imported.length} watch(es)`,
      );
    } catch {
      say("Could not import watches — check the file format");
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  });

  document.getElementById("export-json")!.addEventListener("click", async () => {
    const s = await loadSettings();
    download("mpu-settings-backup.json", JSON.stringify(s, null, 2), "application/json");
    say("Settings backup downloaded");
  });

  document.getElementById("import-json")!.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isSettingsBackup(parsed)) {
        say("Invalid settings file");
        return;
      }
      await saveSettings({ ...(await loadSettings()), ...(parsed as Partial<MpuSettings>) });
      const s = await loadSettings();
      renderFeatures(s);
      renderTrace(s);
      renderFavorites(s);
      renderUpgradeWatches(s);
      renderEnvs(s);
      renderAllowlist(s);
      broadcast();
      say("Settings restored");
    } catch {
      say("Could not restore JSON — file may be invalid");
    } finally {
      (e.target as HTMLInputElement).value = "";
    }
  });
}

void init();
