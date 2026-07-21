import type { MpuSettings } from "../storage/schema";
import type { ParsedPsUrl } from "../adapters/ps-page";
import { extractPageMeta, findHeaderMount, getTargetDocument } from "../adapters/ps-page";
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
  fieldInspectorActive: boolean;
  lockedFieldName?: string | null;
  traceRunning: boolean;
  traceLocked: boolean;
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

  const bar = document.createElement("div");
  bar.id = "mpu-bar";
  bar.className = "mpu-bar";
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

  if (isYes(f.greetingOption)) {
    const env = document.createElement("span");
    env.className = "mpu-env";
    env.textContent = ctx.envLabel || ctx.parsed.siteNormalized || "Environment";
    env.title = "Environment";
    const color = ctx.settings.environments.find((e) => e.label === ctx.envLabel)?.color;
    if (color) env.style.borderBottomColor = color;
    bar.appendChild(env);
  }

  if (isYes(f.userIdOption)) {
    const meta = extractPageMeta(getTargetDocument(doc));
    const user = document.createElement("span");
    user.className = "mpu-user";
    user.textContent = meta.userId ? `User: ${meta.userId}` : "User: —";
    user.title = "Signed-in PeopleSoft user";
    bar.appendChild(user);
  }

  if (isYes(f.shortcutsOption)) {
    const fav = btn("mpu-fav", "★", "Favorites — add current page");
    fav.addEventListener("click", () => ctx.onAddFavorite());
    bar.appendChild(fav);

    if (ctx.settings.favorites.length) {
      const select = document.createElement("select");
      select.id = "mpu-fav-select";
      select.className = "mpu-select";
      select.setAttribute("aria-label", "Open favorite");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Favorites…";
      select.appendChild(placeholder);
      for (const [i, favItem] of ctx.settings.favorites.entries()) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent =
          favItem.Description ||
          `${favItem.Menu}.${favItem.Component}.${favItem.Market}`;
        select.appendChild(opt);
      }
      select.addEventListener("change", () => {
        const idx = Number(select.value);
        if (Number.isNaN(idx)) return;
        const item = ctx.settings.favorites[idx];
        if (!item || !ctx.parsed.baseURL) return;
        injectClearBcs(doc);
        const site = ctx.parsed.siteNormalized;
        const url = `${ctx.parsed.baseURL}/${item.Servlet}/${site}/${ctx.parsed.portal}/${ctx.parsed.node}/c/${item.Menu}.${item.Component}.${item.Market}${item.Parameters || ""}`;
        window.location.href = url;
      });
      bar.appendChild(select);
    }
  }

  if (isYes(f.traceOption)) {
    const label = ctx.traceLocked ? "Trace 🔒" : ctx.traceRunning ? "Trace ON" : "Trace OFF";
    const t = btn("mpu-trace", label, "Toggle PeopleCode/SQL trace", ctx.traceRunning);
    if (ctx.traceLocked) t.disabled = true;
    t.addEventListener("click", () => ctx.onTraceToggle());
    bar.appendChild(t);
  }

  if (isYes(f.pageInfoOption)) {
    const p = btn("mpu-pageinfo", "Page Info", "Show page information");
    p.addEventListener("click", () => ctx.onPageInfo());
    bar.appendChild(p);
  }

  if (isYes(f.recFieldInfoOption)) {
    const fi = btn(
      "mpu-field",
      ctx.fieldInspectorActive ? "Inspect ON" : "Inspect",
      "Toggle field inspector — orange icons appear beside fields",
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
    } else {
      name.textContent = ctx.lockedFieldName ?? "";
    }
    bar.appendChild(name);
  }

  if (isYes(f.newWindowOption)) {
    const nw = btn("mpu-newwin", "New Win", "Open component in new window");
    nw.addEventListener("click", () => ctx.onNewWindow());
    bar.appendChild(nw);
  }

  const help = btn("mpu-help", "?", "Help");
  help.addEventListener("click", () => showHelpDialog(doc));
  bar.appendChild(help);

  if (mount === doc.body) {
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
      <li><strong>Field Inspector</strong> — orange icons beside fields; hover for name; click to lock; Esc to exit</li>
      <li><strong>Trace</strong> — toggle configured PeopleCode/SQL flags</li>
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

export function showPageInfoDialog(doc: Document, parsed: ParsedPsUrl): void {
  const meta = extractPageMeta(getTargetDocument(doc));
  const lines = [
    `Menu: ${meta.menu ?? parsed.menu ?? "—"}`,
    `Component: ${meta.component ?? parsed.component ?? "—"}`,
    `Page: ${meta.page ?? "—"}`,
    `Market: ${parsed.market ?? "—"}`,
    `User: ${meta.userId ?? "—"}`,
    `ToolsRel: ${meta.toolsRel ?? "—"}`,
    `App Server: ${meta.appServer ?? "—"}`,
  ];
  const text = lines.join("\n");

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
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  (dialog.querySelector("#mpu-pi-close") as HTMLButtonElement)?.focus();
}

function injectClearBcs(doc: Document): void {
  const url = chrome.runtime.getURL("inject/clear-bcs.js");
  const s = doc.createElement("script");
  s.src = url;
  s.onload = () => s.remove();
  (doc.head || doc.documentElement).appendChild(s);
}
