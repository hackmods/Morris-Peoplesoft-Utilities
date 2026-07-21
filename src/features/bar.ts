import type { Favorite, MpuSettings } from "../storage/schema";
import type { ParsedPsUrl } from "../adapters/ps-page";
import {
  collectPageMeta,
  detectUiModel,
  findHeaderMount,
  formatPageInfoMarkdown,
  formatPageInfoPlain,
  buildComponentUrl,
} from "../adapters/ps-page";
import { isYes } from "../storage/schema";

export interface BarContext {
  settings: MpuSettings;
  parsed: ParsedPsUrl;
  envLabel: string;
  onTraceToggle: () => void;
  onPageInfo: () => void;
  onFieldInspector: () => void;
  onNewWindow: () => void;
  onAddFavorite: () => void;
  onGoToComponent?: () => void;
  onCopyLockedField?: () => void;
  fieldInspectorActive: boolean;
  lockedFieldName?: string | null;
  traceRunning: boolean;
  traceLocked: boolean;
  /** Classic login/logout: greeting (+ help) only */
  loginMode?: boolean;
}

/** Group favorites for optgroups (FV-01). Empty category → Uncategorized. */
export function groupFavoritesByCategory(
  favorites: Favorite[],
): Array<{ category: string; entries: Array<{ index: number; fav: Favorite }> }> {
  const map = new Map<string, Array<{ index: number; fav: Favorite }>>();
  favorites.forEach((fav, index) => {
    const category = (fav.Category || "").trim() || "Uncategorized";
    const list = map.get(category) || [];
    list.push({ index, fav });
    map.set(category, list);
  });
  const cats = [...map.keys()].sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });
  return cats.map((category) => ({
    category,
    entries: (map.get(category) || []).sort((a, b) =>
      (a.fav.Description || a.fav.Component).localeCompare(b.fav.Description || b.fav.Component),
    ),
  }));
}

function favoriteLabel(fav: Favorite): string {
  const base = fav.Description || `${fav.Menu}.${fav.Component}.${fav.Market}`;
  const sub = (fav.SubCategory || "").trim();
  return sub ? `${sub} — ${base}` : base;
}

function uiModeLabel(doc: Document): string {
  const mode = detectUiModel(doc);
  if (doc.querySelector("#ptifrmtgtframe, #ptifrmtarget")) return "Classic";
  if (mode === "fluid") return "Fluid";
  if (mode === "navCollection") return "Nav";
  if (mode === "classic") return "Classic";
  return "PS";
}

function btn(
  id: string,
  label: string,
  title: string,
  pressed?: boolean,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.id = id;
  b.className = "mpu-btn";
  b.textContent = label;
  b.title = title;
  b.setAttribute("aria-label", title);
  if (pressed !== undefined) {
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
  }
  return b;
}

export function removeBar(doc: Document = document): void {
  doc.getElementById("mpu-bar")?.remove();
  doc.getElementById("mpu-live")?.remove();
}

export function mountBar(ctx: BarContext, doc: Document = document): void {
  removeBar(doc);
  const f = ctx.settings.features;
  const mount = findHeaderMount(doc);
  if (!mount) return;

  const classicTarget = mount.id === "ptifrmtarget" ? mount : null;
  const loginOnly = Boolean(ctx.loginMode);

  const bar = document.createElement("div");
  bar.id = "mpu-bar";
  bar.className = classicTarget ? "mpu-bar mpu-bar-classic" : "mpu-bar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Morris PeopleSoft Utilities");

  const live = document.createElement("div");
  live.id = "mpu-live";
  live.className = "mpu-sr-only";
  live.setAttribute("aria-live", "polite");
  live.setAttribute("aria-atomic", "true");

  const brand = document.createElement("span");
  brand.className = "mpu-brand";
  brand.textContent = "MPU";

  bar.appendChild(brand);

  if (!loginOnly) {
    const mode = document.createElement("span");
    mode.className = "mpu-mode";
    mode.id = "mpu-ui-mode";
    mode.textContent = uiModeLabel(doc);
    mode.title = "PeopleSoft UI model (Classic / Fluid / Nav collection)";
    bar.appendChild(mode);
  }

  if (isYes(f.greetingOption)) {
    const env = document.createElement("span");
    env.className = "mpu-env";
    env.textContent = ctx.envLabel || ctx.parsed.siteNormalized || "Environment";
    env.title = "Environment";
    const color = ctx.settings.environments.find((e) => e.label === ctx.envLabel)?.color;
    if (color) env.style.borderBottomColor = color;
    bar.appendChild(env);
  }

  if (!loginOnly && isYes(f.userIdOption)) {
    const meta = collectPageMeta(doc);
    const user = document.createElement("span");
    user.className = "mpu-user";
    user.textContent = meta.userId ? `User: ${meta.userId}` : "User: —";
    user.title = "Signed-in PeopleSoft user";
    bar.appendChild(user);
  }

  if (!loginOnly && isYes(f.shortcutsOption)) {
    const fav = btn("mpu-fav", "★", "Favorites — add current page");
    fav.addEventListener("click", () => ctx.onAddFavorite());
    bar.appendChild(fav);

    if (ctx.settings.favorites.length) {
      const wrap = document.createElement("span");
      wrap.className = "mpu-fav-wrap";

      const filter = document.createElement("input");
      filter.type = "search";
      filter.id = "mpu-fav-filter";
      filter.className = "mpu-fav-filter";
      filter.placeholder = "Filter…";
      filter.setAttribute("aria-label", "Filter favorites");
      filter.autocomplete = "off";

      const select = document.createElement("select");
      select.id = "mpu-fav-select";
      select.className = "mpu-select";
      select.setAttribute("aria-label", "Open favorite");

      const rebuildOptions = (query: string) => {
        const q = query.trim().toLowerCase();
        select.replaceChildren();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Favorites…";
        select.appendChild(placeholder);

        for (const group of groupFavoritesByCategory(ctx.settings.favorites)) {
          const matching = group.entries.filter(({ fav: item }) => {
            if (!q) return true;
            const hay = [
              item.Description,
              item.Menu,
              item.Component,
              item.Market,
              item.Category,
              item.SubCategory,
            ]
              .join(" ")
              .toLowerCase();
            return hay.includes(q);
          });
          if (!matching.length) continue;
          const og = document.createElement("optgroup");
          og.label = group.category;
          for (const { index, fav: item } of matching) {
            const opt = document.createElement("option");
            opt.value = String(index);
            opt.textContent = favoriteLabel(item);
            og.appendChild(opt);
          }
          select.appendChild(og);
        }
      };

      rebuildOptions("");
      filter.addEventListener("input", () => rebuildOptions(filter.value));
      select.addEventListener("change", () => {
        const idx = Number(select.value);
        if (Number.isNaN(idx)) return;
        const item = ctx.settings.favorites[idx];
        if (!item || !ctx.parsed.baseURL) return;
        injectClearBcs(doc);
        const site = ctx.parsed.site || ctx.parsed.siteNormalized;
        const url = `${ctx.parsed.baseURL}/${item.Servlet}/${site}/${ctx.parsed.portal}/${ctx.parsed.node}/c/${item.Menu}.${item.Component}.${item.Market}${item.Parameters || ""}`;
        window.location.href = url;
      });

      wrap.append(filter, select);
      bar.appendChild(wrap);
    }
  }

  if (!loginOnly && isYes(f.traceOption)) {
    const label = ctx.traceLocked ? "Trace 🔒" : ctx.traceRunning ? "Trace ON" : "Trace OFF";
    const title = ctx.traceLocked
      ? "Trace locked — your user likely lacks access to UTILITIES PeopleCode/SQL Trace components (see FAQ)"
      : "Toggle PeopleCode/SQL trace";
    const t = btn("mpu-trace", label, title, ctx.traceRunning);
    if (ctx.traceLocked) t.disabled = true;
    t.addEventListener("click", () => ctx.onTraceToggle());
    bar.appendChild(t);
  }

  if (!loginOnly && isYes(f.pageInfoOption)) {
    const p = btn("mpu-pageinfo", "Page Info", "Show page information (Alt+Shift+P)");
    p.addEventListener("click", () => ctx.onPageInfo());
    bar.appendChild(p);
  }

  if (!loginOnly && isYes(f.recFieldInfoOption)) {
    const fi = btn(
      "mpu-field",
      ctx.fieldInspectorActive ? "Inspect ON" : "Inspect",
      "Toggle field inspector (Alt+Shift+I) — orange icons beside fields",
      ctx.fieldInspectorActive,
    );
    fi.addEventListener("click", () => ctx.onFieldInspector());
    bar.appendChild(fi);

    const name = document.createElement("span");
    name.id = "mpu-recfield-name";
    name.className = "mpu-recfield-name";
    name.title = "Record.field name (hover or lock via Field Inspector)";
    name.setAttribute("aria-live", "polite");
    if (!ctx.fieldInspectorActive) {
      name.hidden = true;
    } else if (ctx.lockedFieldName) {
      name.textContent = ctx.lockedFieldName;
    }
    bar.appendChild(name);

    const copyField = btn(
      "mpu-copy-field",
      "Copy field",
      "Copy locked RECORD.FIELD to clipboard (Alt+Shift+C)",
    );
    copyField.hidden = !ctx.fieldInspectorActive || !ctx.lockedFieldName;
    copyField.addEventListener("click", () => ctx.onCopyLockedField?.());
    bar.appendChild(copyField);
  }

  if (!loginOnly && isYes(f.newWindowOption) && ctx.parsed.kind === "component") {
    const nw = btn("mpu-newwin", "New Win", "Open component in new window");
    nw.addEventListener("click", () => ctx.onNewWindow());
    bar.appendChild(nw);
  }

  if (
    !loginOnly &&
    ctx.parsed.baseURL &&
    ctx.parsed.portal &&
    ctx.parsed.node &&
    ctx.onGoToComponent
  ) {
    const go = btn("mpu-goto", "Go to", "Go to Menu.Component.Market (Alt+Shift+G)");
    go.addEventListener("click", () => ctx.onGoToComponent?.());
    bar.appendChild(go);
  }

  const help = btn("mpu-help", "?", "Help");
  help.addEventListener("click", () => showHelpDialog(doc));
  bar.appendChild(help);

  if (classicTarget?.parentElement) {
    classicTarget.parentElement.insertBefore(bar, classicTarget);
    // resizeAll can rebuild the content iframe and wipe Field Inspector icons
    if (!ctx.fieldInspectorActive) {
      injectResizeFrame(doc);
    }
  } else if (mount === doc.body) {
    mount.insertBefore(bar, mount.firstChild);
  } else {
    mount.appendChild(bar);
  }
  doc.body.appendChild(live);
  announce(doc, "Morris PeopleSoft Utilities bar ready");
}

export function announce(doc: Document, message: string): void {
  const live = doc.getElementById("mpu-live");
  if (live) live.textContent = message;
}

function showHelpDialog(doc: Document): void {
  const existing = doc.getElementById("mpu-dialog");
  existing?.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "mpu-dialog";
  backdrop.className = "mpu-dialog-backdrop";
  backdrop.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "mpu-dialog-title");

  dialog.innerHTML = `
    <h2 id="mpu-dialog-title">Morris PeopleSoft Utilities</h2>
    <p>Productivity overlay for PeopleSoft Classic and Fluid. Settings stay on this device. No passwords. No telemetry.</p>
    <ul>
      <li><strong>Favorites</strong> — jump to components</li>
      <li><strong>Page Info</strong> — menu/component/page without CTRL+J</li>
      <li><strong>Field Inspector</strong> — orange icons; hover/lock for Rec/Fld/Row; copy on lock (Alt+Shift+C)</li>
      <li><strong>Go to</strong> — jump to Menu.Component.Market</li>
      <li><strong>Trace</strong> — toggle configured PeopleCode/SQL flags</li>
      <li><strong>Shortcuts</strong> — Alt+Shift+P Page Info · Alt+Shift+I Inspect · Alt+Shift+C copy field · Alt+Shift+G Go to</li>
    </ul>
    <p>Maintained by <a href="https://github.com/hackmods" target="_blank" rel="noopener">hackmods</a>. Inspired by PS Utilities.</p>
    <button type="button" class="mpu-btn" id="mpu-dialog-close">Close</button>
  `;

  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  dialog.querySelector("#mpu-dialog-close")?.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  doc.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") close();
    },
    { once: true },
  );
  (dialog.querySelector("#mpu-dialog-close") as HTMLButtonElement)?.focus();
}

export function showPageInfoDialog(
  doc: Document,
  parsed: ParsedPsUrl,
  lockedField?: string | null,
): void {
  const meta = collectPageMeta(doc);
  const text = formatPageInfoPlain(meta, parsed, lockedField);
  const markdown = formatPageInfoMarkdown(meta, parsed, lockedField);

  const existing = doc.getElementById("mpu-dialog");
  existing?.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "mpu-dialog";
  backdrop.className = "mpu-dialog-backdrop";

  const dialog = document.createElement("div");
  dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "mpu-pi-title");
  dialog.innerHTML = `
    <h2 id="mpu-pi-title">Page Information</h2>
    <pre class="mpu-pre" id="mpu-pi-body"></pre>
    <div class="mpu-dialog-actions">
      <button type="button" class="mpu-btn" id="mpu-pi-copy">Copy</button>
      <button type="button" class="mpu-btn" id="mpu-pi-copy-md">Copy Markdown</button>
      <button type="button" class="mpu-btn" id="mpu-pi-close">Close</button>
    </div>
  `;
  (dialog.querySelector("#mpu-pi-body") as HTMLElement).textContent = text;
  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  dialog.querySelector("#mpu-pi-close")?.addEventListener("click", close);
  dialog.querySelector("#mpu-pi-copy")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      announce(doc, "Page information copied");
    } catch {
      announce(doc, "Unable to copy — select text manually");
    }
  });
  dialog.querySelector("#mpu-pi-copy-md")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      announce(doc, "Markdown page info copied");
    } catch {
      announce(doc, "Unable to copy — select text manually");
    }
  });
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  (dialog.querySelector("#mpu-pi-close") as HTMLButtonElement)?.focus();
}

/** In-bar component URL builder (UX-02). */
export function showGoToComponentDialog(doc: Document, parsed: ParsedPsUrl): void {
  if (!parsed.baseURL || !parsed.portal || !parsed.node) {
    announce(doc, "Cannot build component URL on this page");
    return;
  }

  const existing = doc.getElementById("mpu-dialog");
  existing?.remove();

  const backdrop = doc.createElement("div");
  backdrop.id = "mpu-dialog";
  backdrop.className = "mpu-dialog-backdrop";

  const dialog = doc.createElement("div");
  dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "mpu-goto-title");
  dialog.innerHTML = `
    <h2 id="mpu-goto-title">Go to component</h2>
    <p class="mpu-dialog-hint">Navigates in the current portal/node/site. Optional query parameters start with <code>?</code>.</p>
    <form id="mpu-goto-form" class="mpu-goto-form">
      <label>Menu <input id="mpu-goto-menu" name="menu" required autocomplete="off" /></label>
      <label>Component <input id="mpu-goto-comp" name="component" required autocomplete="off" /></label>
      <label>Market <input id="mpu-goto-market" name="market" value="GBL" autocomplete="off" /></label>
      <label>Parameters <input id="mpu-goto-params" name="parameters" placeholder="?ICACTION=..." autocomplete="off" /></label>
      <label class="mpu-goto-check"><input type="checkbox" id="mpu-goto-newwin" /> Open in new window</label>
      <div class="mpu-dialog-actions">
        <button type="submit" class="mpu-btn" id="mpu-goto-go">Go</button>
        <button type="button" class="mpu-btn" id="mpu-goto-close">Close</button>
      </div>
    </form>
  `;

  (dialog.querySelector("#mpu-goto-menu") as HTMLInputElement).value = parsed.menu || "";
  (dialog.querySelector("#mpu-goto-comp") as HTMLInputElement).value = parsed.component || "";
  (dialog.querySelector("#mpu-goto-market") as HTMLInputElement).value = parsed.market || "GBL";

  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  dialog.querySelector("#mpu-goto-close")?.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  doc.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") close();
    },
    { once: true },
  );

  dialog.querySelector("#mpu-goto-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const menu = (dialog.querySelector("#mpu-goto-menu") as HTMLInputElement).value.trim();
    const component = (dialog.querySelector("#mpu-goto-comp") as HTMLInputElement).value.trim();
    const market = (dialog.querySelector("#mpu-goto-market") as HTMLInputElement).value.trim() || "GBL";
    let parameters = (dialog.querySelector("#mpu-goto-params") as HTMLInputElement).value.trim();
    const newWin = (dialog.querySelector("#mpu-goto-newwin") as HTMLInputElement).checked;
    if (parameters && !parameters.startsWith("?") && !parameters.startsWith("/")) {
      parameters = `?${parameters}`;
    }
    const url = buildComponentUrl({
      baseURL: parsed.baseURL,
      servlet: parsed.servlet || "psp",
      site: parsed.site || parsed.siteNormalized,
      portal: parsed.portal,
      node: parsed.node,
      menu,
      component,
      market,
      parameters,
      newWin,
    });
    if (!url) {
      announce(doc, "Enter Menu and Component");
      return;
    }
    injectClearBcs(doc);
    if (newWin) {
      window.open(url, "_blank");
      close();
      return;
    }
    window.location.href = url;
  });

  (dialog.querySelector("#mpu-goto-menu") as HTMLInputElement)?.focus();
}

function injectClearBcs(doc: Document): void {
  const url = chrome.runtime.getURL("inject/clear-bcs.js");
  const s = doc.createElement("script");
  s.src = url;
  s.onload = () => s.remove();
  (doc.head || doc.documentElement).appendChild(s);
}

function injectResizeFrame(doc: Document): void {
  const url = chrome.runtime.getURL("inject/resize-frame.js");
  const s = doc.createElement("script");
  s.src = url;
  s.onload = () => s.remove();
  (doc.head || doc.documentElement).appendChild(s);
}
