import type { Favorite, FieldCopyFormat, MpuSettings, RecentComponent } from "../storage/schema";
import { FIELD_COPY_FORMATS, isYes } from "../storage/schema";
import type { ParsedPsUrl } from "../adapters/ps-page";
import {
  collectPageMeta,
  collectPageTabs,
  detectUiModel,
  findHeaderMount,
  formatPageInfoMarkdown,
  formatPageInfoPlain,
  buildComponentUrl,
  comparePageInfoToBuffer,
  toolsRelTips,
} from "../adapters/ps-page";

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
  onCopyLockedField?: (format?: FieldCopyFormat) => void;
  onPageTabs?: () => void;
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
  const withSub = sub ? `${sub} — ${base}` : base;
  const notes = (fav.Notes || "").trim();
  return notes ? `${withSub} ※` : withSub;
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
  const loginOnly = Boolean(ctx.loginMode);
  const mount = findHeaderMount(doc, { loginMode: loginOnly });
  if (!mount) return;

  const classicTarget = mount.id === "ptifrmtarget" ? mount : null;

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
    if (color) {
      env.style.setProperty("--mpu-env-color", color);
      env.setAttribute("data-mpu-env-colored", "true");
    }
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
    const fav = btn("mpu-fav", "★", "Add current page to favorites");
    fav.addEventListener("click", () => ctx.onAddFavorite());
    bar.appendChild(fav);

    const wrap = document.createElement("span");
    wrap.className = "mpu-fav-wrap";
    let wrapUsed = false;

    if (ctx.settings.favorites.length) {
      wrapUsed = true;
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
        placeholder.textContent = "Open favorite…";
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
            const note = (item.Notes || "").trim();
            opt.title = note
              ? `${item.Menu}.${item.Component} — ${note}`
              : `${item.Menu}.${item.Component}.${item.Market}`;
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
        const newWin =
          isYes(f.newWindowOption) &&
          (doc.getElementById("mpu-fav-newwin") as HTMLInputElement | null)?.checked === true;
        injectClearBcs(doc);
        const url = buildComponentUrl({
          baseURL: ctx.parsed.baseURL,
          servlet: item.Servlet,
          site: ctx.parsed.site || ctx.parsed.siteNormalized,
          portal: ctx.parsed.portal,
          node: ctx.parsed.node,
          menu: item.Menu,
          component: item.Component,
          market: item.Market,
          parameters: item.Parameters || "",
          newWin,
        });
        if (!url) return;
        if (newWin) {
          window.open(url, "_blank");
          select.value = "";
          return;
        }
        window.location.href = url;
      });

      wrap.append(filter, select);
    }

    if (
      isYes(f.newWindowOption) &&
      (ctx.settings.favorites.length > 0 || (ctx.settings.recentComponents || []).length > 0)
    ) {
      wrapUsed = true;
      const lab = document.createElement("label");
      lab.className = "mpu-fav-newwin";
      lab.title = "Open selected favorite or recent component in a new window";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = "mpu-fav-newwin";
      lab.append(cb, document.createTextNode(" New win"));
      wrap.appendChild(lab);
    }

    const recent = ctx.settings.recentComponents || [];
    if (recent.length) {
      wrapUsed = true;
      const recentSelect = document.createElement("select");
      recentSelect.id = "mpu-recent-select";
      recentSelect.className = "mpu-select";
      recentSelect.setAttribute("aria-label", "Open recent component");
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = "Recent…";
      recentSelect.appendChild(ph);
      recent.forEach((item, index) => {
        const opt = document.createElement("option");
        opt.value = String(index);
        opt.textContent = `${item.Menu}.${item.Component}.${item.Market || "GBL"}`;
        recentSelect.appendChild(opt);
      });
      recentSelect.addEventListener("change", () => {
        const idx = Number(recentSelect.value);
        if (Number.isNaN(idx)) return;
        const item = recent[idx] as RecentComponent | undefined;
        if (!item || !ctx.parsed.baseURL) return;
        const newWin =
          isYes(f.newWindowOption) &&
          (doc.getElementById("mpu-fav-newwin") as HTMLInputElement | null)?.checked === true;
        injectClearBcs(doc);
        const url = buildComponentUrl({
          baseURL: ctx.parsed.baseURL,
          servlet: item.Servlet,
          site: item.Site || ctx.parsed.site || ctx.parsed.siteNormalized,
          portal: item.Portal || ctx.parsed.portal,
          node: item.Node || ctx.parsed.node,
          menu: item.Menu,
          component: item.Component,
          market: item.Market,
          newWin,
        });
        if (!url) return;
        if (newWin) {
          window.open(url, "_blank");
          recentSelect.value = "";
          return;
        }
        window.location.href = url;
      });
      wrap.appendChild(recentSelect);
    }

    if (wrapUsed) bar.appendChild(wrap);
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

    const copyFmt = document.createElement("select");
    copyFmt.id = "mpu-copy-format";
    copyFmt.className = "mpu-select mpu-copy-format";
    copyFmt.setAttribute("aria-label", "PeopleCode copy format");
    copyFmt.hidden = !ctx.fieldInspectorActive || !ctx.lockedFieldName;
    const preferred = ctx.settings.fieldCopyFormat || "record.field";
    for (const fmt of FIELD_COPY_FORMATS) {
      const opt = document.createElement("option");
      opt.value = fmt.id;
      opt.textContent = fmt.label;
      opt.title = fmt.example;
      if (fmt.id === preferred) opt.selected = true;
      copyFmt.appendChild(opt);
    }
    bar.appendChild(copyFmt);

    const copyField = btn(
      "mpu-copy-field",
      "Copy field",
      "Copy locked field using selected PeopleCode format (Alt+Shift+C)",
    );
    copyField.hidden = !ctx.fieldInspectorActive || !ctx.lockedFieldName;
    copyField.addEventListener("click", () => {
      const format = (copyFmt.value || preferred) as FieldCopyFormat;
      ctx.onCopyLockedField?.(format);
    });
    bar.appendChild(copyField);
  }

  if (!loginOnly && isYes(f.pageInfoOption) && ctx.onPageTabs) {
    const tabs = btn("mpu-pagetabs", "Page Tabs", "List delivered page/tab links on this component");
    tabs.addEventListener("click", () => ctx.onPageTabs?.());
    bar.appendChild(tabs);
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
  } else if (loginOnly && mount !== doc.body && mount.parentElement) {
    // SP-08: insert above password form container, not inside it
    mount.parentElement.insertBefore(bar, mount);
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

function openModalDialog(
  doc: Document,
  opts: {
    labelledBy: string;
    build: (dialog: HTMLDivElement, close: () => void) => void;
    initialFocus: string;
  },
): void {
  doc.getElementById("mpu-dialog")?.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "mpu-dialog";
  backdrop.className = "mpu-dialog-backdrop";
  backdrop.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", opts.labelledBy);

  const close = (): void => {
    doc.removeEventListener("keydown", onKey);
    backdrop.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  opts.build(dialog, close);
  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  doc.addEventListener("keydown", onKey);
  (dialog.querySelector(opts.initialFocus) as HTMLElement | null)?.focus();
}

function showHelpDialog(doc: Document): void {
  const meta = collectPageMeta(doc);
  const tips = toolsRelTips(meta.toolsRel, meta.uiMode || detectUiModel(doc));
  const tipHtml = tips.length
    ? `<h3>Tips for this page</h3><ul>${tips.map(() => `<li></li>`).join("")}</ul>`
    : "";

  openModalDialog(doc, {
    labelledBy: "mpu-dialog-title",
    initialFocus: "#mpu-dialog-close",
    build: (dialog, close) => {
      dialog.innerHTML = `
    <h2 id="mpu-dialog-title">Morris PeopleSoft Utilities</h2>
    <p>Productivity overlay for PeopleSoft Classic and Fluid. Settings stay on this device. No passwords. No telemetry.</p>
    <ul>
      <li><strong>Favorites</strong> — ★ adds the current component; use the dropdown to open one</li>
      <li><strong>Page Info</strong> — menu/component/page; Compare clipboard across envs</li>
      <li><strong>Page Tabs</strong> — delivered multi-page links when present</li>
      <li><strong>Field Inspector</strong> — orange icons; PeopleCode copy formats; Alt+Shift+C</li>
      <li><strong>Go to</strong> — jump to Menu.Component.Market</li>
      <li><strong>Trace</strong> — toggle configured PeopleCode/SQL flags</li>
      <li><strong>Shortcuts</strong> — Alt+Shift+P/I/C/G</li>
    </ul>
    ${tipHtml}
    <p>Maintained by <a href="https://github.com/hackmods" target="_blank" rel="noopener">hackmods</a>. Inspired by PS Utilities.</p>
    <button type="button" class="mpu-btn" id="mpu-dialog-close">Close</button>
  `;

      if (tips.length) {
        const lis = dialog.querySelectorAll("h3 + ul li");
        tips.forEach((tip, i) => {
          if (lis[i]) lis[i].textContent = tip;
        });
      }

      dialog.querySelector("#mpu-dialog-close")?.addEventListener("click", close);
    },
  });
}

/** CSP-safe Page Tabs list from delivered links (SP-01). */
export function showPageTabsDialog(doc: Document): void {
  const tabs = collectPageTabs(doc);
  const existing = doc.getElementById("mpu-dialog");
  existing?.remove();

  const backdrop = doc.createElement("div");
  backdrop.id = "mpu-dialog";
  backdrop.className = "mpu-dialog-backdrop";

  const dialog = doc.createElement("div");
  dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "mpu-tabs-title");

  const list = tabs.length
    ? `<ul class="mpu-page-tabs-list" id="mpu-tabs-list"></ul>`
    : `<p>No delivered page/tab links found on this page.</p>`;

  dialog.innerHTML = `
    <h2 id="mpu-tabs-title">Page Tabs</h2>
    <p class="mpu-dialog-hint">Clicks the same PeopleSoft tab controls already on the page (inline UI only).</p>
    ${list}
    <div class="mpu-dialog-actions">
      <button type="button" class="mpu-btn" id="mpu-tabs-close">Close</button>
    </div>
  `;

  const ul = dialog.querySelector("#mpu-tabs-list");
  if (ul) {
    for (const tab of tabs) {
      const li = doc.createElement("li");
      const b = doc.createElement("button");
      b.type = "button";
      b.className = "mpu-btn";
      b.textContent = tab.label;
      b.addEventListener("click", () => {
        tab.el.click();
        announce(doc, `Activated tab ${tab.label}`);
        backdrop.remove();
      });
      li.appendChild(b);
      ul.appendChild(li);
    }
  }

  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  dialog.querySelector("#mpu-tabs-close")?.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  (dialog.querySelector("#mpu-tabs-close") as HTMLButtonElement)?.focus();
}

export function showPageInfoDialog(
  doc: Document,
  parsed: ParsedPsUrl,
  lockedField?: string | null,
): void {
  const meta = collectPageMeta(doc);
  const text = formatPageInfoPlain(meta, parsed, lockedField);
  const markdown = formatPageInfoMarkdown(meta, parsed, lockedField);

  openModalDialog(doc, {
    labelledBy: "mpu-pi-title",
    initialFocus: "#mpu-pi-close",
    build: (dialog, close) => {
      dialog.innerHTML = `
    <h2 id="mpu-pi-title">Page Information</h2>
    <pre class="mpu-pre" id="mpu-pi-body"></pre>
    <pre class="mpu-pre mpu-pre-diff" id="mpu-pi-diff" hidden></pre>
    <div class="mpu-dialog-actions">
      <button type="button" class="mpu-btn" id="mpu-pi-copy">Copy</button>
      <button type="button" class="mpu-btn" id="mpu-pi-copy-md">Copy Markdown</button>
      <button type="button" class="mpu-btn" id="mpu-pi-compare">Compare clipboard</button>
      <button type="button" class="mpu-btn" id="mpu-pi-close">Close</button>
    </div>
  `;
      (dialog.querySelector("#mpu-pi-body") as HTMLElement).textContent = text;
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
      dialog.querySelector("#mpu-pi-compare")?.addEventListener("click", async () => {
        const diffEl = dialog.querySelector("#mpu-pi-diff") as HTMLElement;
        try {
          const clip = await navigator.clipboard.readText();
          if (!clip.trim()) {
            announce(doc, "Clipboard is empty — copy Page Info from another env first");
            return;
          }
          const { lines, changedCount } = comparePageInfoToBuffer(text, clip);
          const out = lines
            .map((l) => `${l.changed ? "≠" : "="} ${l.key}: ${l.other} → ${l.current}`)
            .join("\n");
          diffEl.hidden = false;
          diffEl.textContent = `Compare vs clipboard (${changedCount} differ)\n${out}`;
          announce(
            doc,
            changedCount === 0
              ? "Page Info matches clipboard"
              : `${changedCount} Page Info field(s) differ from clipboard`,
          );
        } catch {
          announce(doc, "Unable to read clipboard for compare");
        }
      });
    },
  });
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
