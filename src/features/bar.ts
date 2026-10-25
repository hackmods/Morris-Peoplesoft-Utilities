import { getExtensionApi } from "../platform/browser";
import { bindModalDialog } from "./dialog";
import { appendAgentHelp } from "./agent-references";
import { isVisible } from "../adapters/dom";
import type { Favorite, FieldCopyFormat, MpuSettings, RecentComponent, TraceSettings, TraceRequest } from "../storage/schema";
import { featureAllowedForUi, FIELD_COPY_FORMATS, isYes } from "../storage/schema";
import type { PageTabLink, ParsedPsUrl } from "../adapters/ps-page";
import {
  parsePsUrl,
  collectPageMeta,
  collectPageTabs,
  detectUiModel,
  detectFluidCrefPath,
  detectFluidTheme,
  findHeaderMount,
  formatPageInfoMarkdown,
  formatPageInfoPlain,
  buildComponentUrl,
  comparePageInfoToBuffer,
  toolsRelTips,
} from "../adapters/ps-page";
import { buildEnvContextRows, formatEnvContextPlain } from "../adapters/env-context";
import { environmentForPage } from "./production-awareness";
import { showComparisonCaptureDialog } from "./environment-comparison-ui";
import {
  buildFavoriteTree,
  favoriteDisplayLabel,
  type FavoriteEntry,
  type FavoriteTreeGroup,
} from "./favorites-ui";
import {
  compareObjectPackToBuffer,
  formatObjectPackMarkdown,
  formatObjectPackPlain,
} from "./peoplecode-aids";
import { bindPeopleCodeContextUI } from "./peoplecode-context-ui";
import { collectFluidStructure, formatFluidStructurePlain } from "./fluid-structure";
import { collectFluidDebugSnapshot, formatFluidDebugSnapshot } from "./fluid-debugger";
import { groupAdminJumps, type AdminJump } from "./admin-jumps";
import { getLockedParsedRecField } from "./field-inspector";
import { scanMessageKeys, formatMessageKeysPlain } from "./message-keys";
import { collectIbBreadcrumb, formatIbBreadcrumbPlain } from "./ib-breadcrumb";
import {
  collectProcessPack,
  formatProcessPackPlain,
  isProcessMonitorPage,
} from "./process-pack";
import { formatTraceBarHint, summarizeActiveTraceFlags } from "./trace-presets";
import { describeTraceRequest } from "./trace-status";
import { currentPageAccess } from "./access";
import { buildDiagnosticReport } from "./diagnostics";
import { loadSettings, saveSettings, originAllowed } from "../storage/settings";
import {
  capturePageFingerprint,
  compareFingerprints,
  createWatchFromFingerprint,
  findWatchForParsed,
  upsertWatch,
  listWatchesForParsed,
  watchScope,
  formatDriftHandoffMarkdown,
} from "./upgrade-watch";
import {
  clearBufferAndPreview,
  runCapture,
  runPastePreview,
  showFindReplaceDialog,
  showLoadProfileDialog,
  showSaveProfileDialog,
  showSheetPasteDialog,
} from "./field-entry-ui";
import { getSessionBuffer } from "./field-entry";
export interface BarContext {
  settings: MpuSettings;
  parsed: ParsedPsUrl;
  envLabel: string;
  onTraceToggle: () => void;
  onTraceRequest?: (turnOn: boolean) => void;
  traceRequest?: TraceRequest;
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
  traceSettings: TraceSettings;
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

let menuDismissAbort: AbortController | null = null;
/** Scroll/resize listeners that keep an open root flyout aligned to its button. */
let flyoutPositionAbort: AbortController | null = null;
/** Where a portaled root flyout should return when closed. */
const flyoutHomes = new WeakMap<HTMLElement, { parent: Node; next: ChildNode | null }>();

function endMenuDismiss(): void {
  menuDismissAbort?.abort();
  menuDismissAbort = null;
}

function endFlyoutPosition(): void {
  flyoutPositionAbort?.abort();
  flyoutPositionAbort = null;
}

function restorePortaledFlyout(flyout: HTMLElement): void {
  const home = flyoutHomes.get(flyout);
  if (!home?.parent?.isConnected) {
    flyoutHomes.delete(flyout);
    return;
  }
  if (flyout.parentNode === home.parent) return;
  if (home.next && home.next.parentNode === home.parent) {
    home.parent.insertBefore(flyout, home.next);
  } else {
    home.parent.appendChild(flyout);
  }
  flyoutHomes.delete(flyout);
}

function portalFlyoutToBody(flyout: HTMLElement): void {
  const doc = flyout.ownerDocument;
  if (!doc.body || flyout.parentElement === doc.body) return;
  if (!flyoutHomes.has(flyout)) {
    flyoutHomes.set(flyout, { parent: flyout.parentNode!, next: flyout.nextSibling });
  }
  doc.body.appendChild(flyout);
}

function closeAllFlyouts(doc: Document): void {
  endMenuDismiss();
  endFlyoutPosition();
  doc.querySelectorAll('.mpu-menu-root [aria-expanded="true"]').forEach((el) => {
    el.setAttribute("aria-expanded", "false");
  });
  doc.querySelectorAll(".mpu-flyout").forEach((el) => {
    const flyout = el as HTMLElement;
    flyout.hidden = true;
    restorePortaledFlyout(flyout);
  });
}

/**
 * Hang root flyouts from the MPU bar (top chrome), portaled to document.body.
 * Dropdowns will overlay page content below the bar — that is intentional —
 * but they stay attached to the bar band instead of floating mid-page.
 */
function placeAnchoredFlyout(anchor: HTMLElement, flyout: HTMLElement): void {
  portalFlyoutToBody(flyout);
  const doc = anchor.ownerDocument;
  const view = doc.defaultView;
  const vw = view?.innerWidth ?? 1200;
  const vh = view?.innerHeight ?? 800;
  const bar = doc.getElementById("mpu-bar");
  const barRect = bar?.getBoundingClientRect();
  const btnRect = anchor.getBoundingClientRect();

  // Prefer the full bar bottom edge so the menu reads as top chrome
  const bandBottom = barRect && barRect.height > 0 ? barRect.bottom : btnRect.bottom;
  const roomBelow = Math.max(80, vh - bandBottom - 8);
  const maxH = Math.min(Math.floor(roomBelow), 480);
  const width = Math.min(Math.max(flyout.offsetWidth || 240, 240), Math.min(400, vw - 8));

  flyout.classList.add("mpu-flyout-top");
  flyout.style.position = "fixed";
  flyout.style.zIndex = "2147482500";
  flyout.style.maxHeight = `${maxH}px`;
  flyout.style.width = `${width}px`;
  flyout.style.right = "auto";
  flyout.style.bottom = "auto";
  flyout.style.margin = "0";
  flyout.style.transform = "none";

  const height = Math.min(flyout.offsetHeight || 160, maxH);

  // Align under the button, but keep the panel within the viewport
  let left = btnRect.left;
  if (barRect && barRect.width > 0) {
    // Prefer staying under the bar strip when possible
    left = Math.min(Math.max(btnRect.left, barRect.left), Math.max(4, barRect.right - width));
  }
  if (left + width > vw - 4) left = Math.max(4, vw - width - 4);
  if (left < 4) left = 4;

  // Always open downward from the bar first (up-top chrome). Flip above only if
  // there is almost no room below (e.g. bar wrapped near the bottom of the viewport).
  let top = bandBottom + 2;
  if (roomBelow < Math.min(height, 140) && barRect) {
    const above = barRect.top - 2 - height;
    if (above >= 4) top = above;
  }

  flyout.style.top = `${Math.round(top)}px`;
  flyout.style.left = `${Math.round(left)}px`;
}

function bindFlyoutPosition(anchor: HTMLElement, flyout: HTMLElement): void {
  endFlyoutPosition();
  const ac = new AbortController();
  flyoutPositionAbort = ac;
  const place = (): void => {
    if (flyout.hidden) return;
    placeAnchoredFlyout(anchor, flyout);
  };
  place();
  const view = anchor.ownerDocument.defaultView;
  view?.requestAnimationFrame(() => {
    place();
    view.requestAnimationFrame(place);
  });
  view?.addEventListener("scroll", place, { capture: true, signal: ac.signal });
  view?.addEventListener("resize", place, { signal: ac.signal });
}

function bindMenuDismiss(
  doc: Document,
  root: HTMLElement,
  close: () => void,
  flyout?: HTMLElement,
): void {
  endMenuDismiss();
  const ac = new AbortController();
  menuDismissAbort = ac;
  const { signal } = ac;
  const view = doc.defaultView;

  doc.addEventListener(
    "click",
    (e) => {
      const t = e.target as Node;
      if (root.contains(t) || (flyout && flyout.contains(t))) return;
      close();
    },
    { signal },
  );
  doc.addEventListener(
    "keydown",
    (e) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        root.querySelector<HTMLElement>("button")?.focus();
        return;
      }
      const active = doc.activeElement as HTMLElement | null;
      if (!active || !flyout?.contains(active)) return;
      if (e.key === "Tab") {
        close();
        root.querySelector<HTMLElement>("button")?.focus();
        return; // Browser advances to the previous/next toolbar control.
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      if (active.matches("input, textarea") && !e.key.startsWith("Arrow")) return;
      const menu = active.closest('[role="menu"]') ?? flyout.querySelector('[role="menu"]') ?? flyout;
      const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'))
        .filter((item) => item.closest('[role="menu"]') === menu && isVisible(item));
      if (!items.length) return;
      e.preventDefault();
      const index = items.indexOf(active);
      const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1
        : e.key === "ArrowDown" ? (index + 1) % items.length
        : (index < 0 ? items.length - 1 : (index + items.length - 1) % items.length);
      items[next].focus();
    },
    { signal },
  );

  // Classic/Fluid content lives in iframes — clicks there never bubble to the portal
  // document, so open menus would otherwise keep covering Run / Process Scheduler
  // controls. Close as soon as focus moves into a frame (or the portal window blurs).
  const closeIfEnteredFrame = (): void => {
    view?.setTimeout(() => {
      if (signal.aborted) return;
      const ae = doc.activeElement;
      if (ae && (ae.tagName === "IFRAME" || ae.tagName === "FRAME")) {
        close();
        return;
      }
      if (view && view.document.hasFocus && !view.document.hasFocus()) {
        close();
      }
    }, 0);
  };
  view?.addEventListener("blur", closeIfEnteredFrame, { signal });
  doc.addEventListener(
    "pointerdown",
    (e) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest("iframe, frame, #ptifrmtarget, #ptifrmtgtframe")) {
        close();
      }
    },
    { capture: true, signal },
  );
}

function favoriteMatchesQuery(fav: Favorite, query: string): boolean {
  if (!query) return true;
  const hay = [
    fav.Description,
    fav.Menu,
    fav.Component,
    fav.Market,
    fav.Category,
    fav.SubCategory,
    fav.Notes,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

function filterFavoriteTree(
  tree: FavoriteTreeGroup[],
  query: string,
): FavoriteTreeGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return tree;
  return tree
    .map((group) => {
      const leaves = group.leaves.filter(({ fav }) => favoriteMatchesQuery(fav, q));
      const subgroups = group.subgroups
        .map((sg) => ({
          ...sg,
          entries: sg.entries.filter(({ fav }) => favoriteMatchesQuery(fav, q)),
        }))
        .filter((sg) => sg.entries.length > 0);
      return { ...group, leaves, subgroups };
    })
    .filter((group) => group.leaves.length > 0 || group.subgroups.length > 0);
}

function openFavoriteShortcut(
  doc: Document,
  ctx: BarContext,
  item: Favorite,
  newWin: boolean,
  onDone?: () => void,
): void {
  if (!ctx.parsed.baseURL) return;
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
  onDone?.();
  if (newWin) {
    window.open(url, "_blank");
    return;
  }
  window.location.href = url;
}

function favoriteLeafTitle(fav: Favorite): string {
  const note = (fav.Notes || "").trim();
  return note
    ? `${fav.Menu}.${fav.Component} — ${note}`
    : `${fav.Menu}.${fav.Component}.${fav.Market}`;
}

function appendFavoriteLeaf(
  doc: Document,
  container: HTMLElement,
  entry: FavoriteEntry,
  ctx: BarContext,
  newWindowOption: boolean,
  onNavigate: () => void,
): void {
  const item = doc.createElement("div");
  item.className = "mpu-menu-item";
  item.setAttribute("role", "none");

  const row = doc.createElement("div");
  row.className = "mpu-menu-row";

  const openBtn = doc.createElement("button");
  openBtn.type = "button";
  openBtn.className = "mpu-menu-open";
  openBtn.setAttribute("role", "menuitem");
  openBtn.textContent = favoriteDisplayLabel(entry.fav);
  openBtn.title = favoriteLeafTitle(entry.fav);
  openBtn.addEventListener("click", () => {
    openFavoriteShortcut(doc, ctx, entry.fav, false, onNavigate);
  });
  row.appendChild(openBtn);

  if (newWindowOption) {
    const nw = doc.createElement("button");
    nw.type = "button";
    nw.className = "mpu-menu-newwin";
    nw.setAttribute("role", "menuitem");
    nw.textContent = "↗";
    nw.title = "Open in new window";
    nw.setAttribute("aria-label", "Open in new window");
    nw.addEventListener("click", (e) => {
      e.stopPropagation();
      openFavoriteShortcut(doc, ctx, entry.fav, true, onNavigate);
    });
    row.appendChild(nw);
  }

  item.appendChild(row);
  container.appendChild(item);
}

function wireSubmenuHover(item: HTMLElement, sub: HTMLElement): void {
  const HIDE_MS = 220;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  const doc = item.ownerDocument;
  const view = doc.defaultView;
  const trigger =
    (item.querySelector(".mpu-menu-subtrigger") as HTMLElement | null) || item;

  const clearHide = (): void => {
    if (hideTimer != null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const setExpanded = (open: boolean): void => {
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  };

  const place = (): void => {
    const rect = trigger.getBoundingClientRect();
    const vw = view?.innerWidth ?? 1200;
    const vh = view?.innerHeight ?? 800;
    const width = Math.min(sub.offsetWidth || 224, vw - 8);
    const height = Math.min(sub.offsetHeight || 160, vh - 8);
    let left = rect.right - 4; // slight overlap — no hover gap
    let top = rect.top;
    if (left + width > vw - 4) {
      left = Math.max(4, rect.left - width + 4);
    }
    if (top + height > vh - 4) {
      top = Math.max(4, vh - height - 4);
    }
    sub.style.position = "fixed";
    sub.style.top = `${Math.round(top)}px`;
    sub.style.left = `${Math.round(left)}px`;
    sub.style.right = "auto";
    sub.style.margin = "0";
  };

  const hideNested = (): void => {
    sub.querySelectorAll(".mpu-flyout-sub").forEach((el) => {
      (el as HTMLElement).hidden = true;
      const nestedTrigger = el.parentElement?.querySelector(".mpu-menu-subtrigger");
      nestedTrigger?.setAttribute("aria-expanded", "false");
    });
  };

  const hide = (): void => {
    clearHide();
    sub.hidden = true;
    setExpanded(false);
    hideNested();
    view?.removeEventListener("scroll", onReposition, true);
    view?.removeEventListener("resize", onReposition);
  };

  const onReposition = (): void => {
    if (!sub.hidden) place();
  };

  const show = (): void => {
    clearHide();
    const parent = item.parentElement;
    if (parent) {
      parent.querySelectorAll(":scope > .mpu-menu-has-sub").forEach((sib) => {
        if (sib === item) return;
        const otherSub = sib.querySelector(":scope > .mpu-flyout-sub") as HTMLElement | null;
        const otherTrigger = sib.querySelector(".mpu-menu-subtrigger");
        if (otherSub && !otherSub.hidden) {
          otherSub.hidden = true;
          otherTrigger?.setAttribute("aria-expanded", "false");
          otherSub.querySelectorAll(".mpu-flyout-sub").forEach((el) => {
            (el as HTMLElement).hidden = true;
          });
        }
      });
    }
    sub.hidden = false;
    setExpanded(true);
    place();
    // Second place after paint so offsetWidth/Height are accurate
    view?.requestAnimationFrame(() => {
      if (!sub.hidden) place();
    });
    view?.addEventListener("scroll", onReposition, { capture: true, signal: flyoutPositionAbort?.signal });
    view?.addEventListener("resize", onReposition, { signal: flyoutPositionAbort?.signal });
  };

  const scheduleHide = (): void => {
    clearHide();
    hideTimer = setTimeout(() => {
      hideTimer = null;
      hide();
    }, HIDE_MS);
  };

  trigger.setAttribute("aria-expanded", "false");
  trigger.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "Enter", " "].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    show();
    sub.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  });
  sub.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "Escape"].includes(e.key) ||
      (e.target as Element).closest('[role="menu"]') !== sub) return;
    e.preventDefault();
    e.stopPropagation();
    trigger.focus();
    hide();
  });

  item.addEventListener("mouseenter", show);
  item.addEventListener("mouseleave", scheduleHide);
  // Sub is position:fixed (outside item box) — keep open while pointer is on it
  sub.addEventListener("mouseenter", () => {
    clearHide();
    sub.hidden = false;
    setExpanded(true);
  });
  sub.addEventListener("mouseleave", scheduleHide);

  item.addEventListener("focusin", show);
  item.addEventListener("focusout", (e) => {
    const next = e.relatedTarget as Node | null;
    if (item.contains(next) || sub.contains(next)) return;
    scheduleHide();
  });
  sub.addEventListener("focusin", () => {
    clearHide();
    sub.hidden = false;
    setExpanded(true);
  });
  sub.addEventListener("focusout", (e) => {
    const next = e.relatedTarget as Node | null;
    if (item.contains(next) || sub.contains(next)) return;
    scheduleHide();
  });
}

function appendFavoriteSubgroup(
  doc: Document,
  parent: HTMLElement,
  subgroup: { subcategory: string; entries: FavoriteEntry[] },
  ctx: BarContext,
  newWindowOption: boolean,
  onNavigate: () => void,
): void {
  const item = doc.createElement("div");
  item.className = "mpu-menu-item mpu-menu-has-sub";
  item.setAttribute("role", "none");

  const trigger = doc.createElement("button");
  trigger.type = "button";
  trigger.className = "mpu-menu-row mpu-menu-subtrigger";
  trigger.setAttribute("role", "menuitem");
  trigger.setAttribute("aria-haspopup", "true");
  trigger.textContent = `${subgroup.subcategory} »`;

  const sub = doc.createElement("div");
  sub.className = "mpu-flyout mpu-flyout-sub";
  sub.setAttribute("role", "menu");
  sub.hidden = true;

  for (const entry of subgroup.entries) {
    appendFavoriteLeaf(doc, sub, entry, ctx, newWindowOption, onNavigate);
  }

  item.append(trigger, sub);
  parent.appendChild(item);
  wireSubmenuHover(item, sub);
}

function appendFavoriteCategory(
  doc: Document,
  parent: HTMLElement,
  group: FavoriteTreeGroup,
  ctx: BarContext,
  newWindowOption: boolean,
  onNavigate: () => void,
): void {
  const hasSubmenu = group.subgroups.length > 0 || group.leaves.length > 0;
  if (!hasSubmenu) return;

  const onlyLeaves = group.subgroups.length === 0;
  if (onlyLeaves && group.leaves.length === 1 && parent.classList.contains("mpu-flyout")) {
    appendFavoriteLeaf(doc, parent, group.leaves[0]!, ctx, newWindowOption, onNavigate);
    return;
  }

  const item = doc.createElement("div");
  item.className = "mpu-menu-item mpu-menu-has-sub";
  item.setAttribute("role", "none");

  const trigger = doc.createElement("button");
  trigger.type = "button";
  trigger.className = "mpu-menu-row mpu-menu-subtrigger";
  trigger.setAttribute("role", "menuitem");
  trigger.setAttribute("aria-haspopup", "true");
  trigger.textContent = `${group.category} »`;

  const sub = doc.createElement("div");
  sub.className = "mpu-flyout mpu-flyout-sub";
  sub.setAttribute("role", "menu");
  sub.hidden = true;

  for (const entry of group.leaves) {
    appendFavoriteLeaf(doc, sub, entry, ctx, newWindowOption, onNavigate);
  }
  for (const subgroup of group.subgroups) {
    appendFavoriteSubgroup(doc, sub, subgroup, ctx, newWindowOption, onNavigate);
  }

  item.append(trigger, sub);
  parent.appendChild(item);
  wireSubmenuHover(item, sub);
}

function buildShortcutsFlyoutBody(
  doc: Document,
  flyout: HTMLElement,
  ctx: BarContext,
  query: string,
  onNavigate: () => void,
): void {
  const f = ctx.settings.features;
  const newWin = isYes(f.newWindowOption);
  flyout.replaceChildren();

  const addItem = doc.createElement("div");
  addItem.className = "mpu-menu-item";
  addItem.setAttribute("role", "none");
  const addBtn = doc.createElement("button");
  addBtn.type = "button";
  addBtn.className = "mpu-menu-row mpu-menu-action";
  addBtn.setAttribute("role", "menuitem");
  addBtn.textContent = "Add to Shortcuts";
  addBtn.addEventListener("click", () => {
    onNavigate();
    ctx.onAddFavorite();
  });
  addItem.appendChild(addBtn);
  flyout.appendChild(addItem);

  const tree = filterFavoriteTree(buildFavoriteTree(ctx.settings.favorites), query);
  if (!tree.length && ctx.settings.favorites.length) {
    const empty = doc.createElement("p");
    empty.className = "mpu-menu-empty";
    empty.textContent = "No shortcuts match your filter.";
    flyout.appendChild(empty);
    return;
  }

  for (const group of tree) {
    appendFavoriteCategory(doc, flyout, group, ctx, newWin, onNavigate);
  }
}

function appendPageTabMenuItem(
  doc: Document,
  container: HTMLElement,
  tab: PageTabLink,
  onActivate?: () => void,
): void {
  const item = doc.createElement("div");
  item.className = "mpu-menu-item";
  item.setAttribute("role", "none");

  const btn = doc.createElement("button");
  btn.type = "button";
  btn.className = "mpu-menu-open";
  btn.setAttribute("role", "menuitem");
  btn.textContent = tab.label;
  if (tab.current) {
    btn.classList.add("mpu-menu-current");
    btn.setAttribute("aria-current", "page");
    btn.disabled = true;
  } else {
    btn.addEventListener("click", () => {
      tab.el.click();
      announce(doc, `Activated tab ${tab.label}`);
      onActivate?.();
    });
  }
  item.appendChild(btn);
  container.appendChild(item);
}

function populatePagesMenu(
  doc: Document,
  container: HTMLElement,
  onActivate?: () => void,
): void {
  const tabs = collectPageTabs(doc);
  container.replaceChildren();
  if (!tabs.length) {
    const empty = doc.createElement("button");
    empty.type = "button";
    empty.disabled = true;
    empty.setAttribute("role", "menuitem");
    empty.className = "mpu-menu-empty";
    empty.textContent = "No delivered page/tab links found on this page.";
    container.appendChild(empty);
    return;
  }
  for (const tab of tabs) {
    appendPageTabMenuItem(doc, container, tab, onActivate);
  }
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

async function copyText(doc: Document, text: string, successMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    announce(doc, successMessage);
  } catch {
    announce(doc, "Unable to copy — select text manually");
  }
}

function navigateAdminJump(
  doc: Document,
  ctx: BarContext,
  jump: AdminJump,
  newWin: boolean,
  onDone?: () => void,
): void {
  if (!ctx.parsed.baseURL || !ctx.parsed.portal || !ctx.parsed.node) {
    announce(doc, "Cannot build admin URL on this page");
    return;
  }
  injectClearBcs(doc);
  const url = buildComponentUrl({
    baseURL: ctx.parsed.baseURL,
    servlet: ctx.parsed.servlet || "psp",
    site: ctx.parsed.site || ctx.parsed.siteNormalized,
    portal: ctx.parsed.portal,
    node: ctx.parsed.node,
    menu: jump.menu,
    component: jump.component,
    market: jump.market || "GBL",
    newWin,
  });
  if (!url) {
    announce(doc, `Unable to open ${jump.label}`);
    return;
  }
  onDone?.();
  if (newWin) {
    window.open(url, "_blank");
    return;
  }
  window.location.href = url;
}

function buildAdminFlyoutBody(
  doc: Document,
  flyout: HTMLElement,
  ctx: BarContext,
  onNavigate: () => void,
): void {
  const newWin = isYes(ctx.settings.features.newWindowOption);
  flyout.replaceChildren();
  for (const group of groupAdminJumps()) {
    const item = doc.createElement("div");
    item.className = "mpu-menu-item mpu-menu-has-sub";
    item.setAttribute("role", "none");

    const trigger = doc.createElement("button");
    trigger.type = "button";
    trigger.className = "mpu-menu-row mpu-menu-subtrigger";
    trigger.setAttribute("role", "menuitem");
    trigger.setAttribute("aria-haspopup", "true");
    trigger.textContent = `${group.category} »`;

    const sub = doc.createElement("div");
    sub.className = "mpu-flyout mpu-flyout-sub";
    sub.setAttribute("role", "menu");
    sub.hidden = true;

    for (const jump of group.items) {
      const leaf = doc.createElement("div");
      leaf.className = "mpu-menu-item";
      leaf.setAttribute("role", "none");

      const row = doc.createElement("div");
      row.className = "mpu-menu-row";

      const openBtn = doc.createElement("button");
      openBtn.type = "button";
      openBtn.className = "mpu-menu-open";
      openBtn.setAttribute("role", "menuitem");
      openBtn.textContent = jump.label;
      openBtn.title = `${jump.menu}.${jump.component}`;
      openBtn.addEventListener("click", () => {
        navigateAdminJump(doc, ctx, jump, false, onNavigate);
      });
      row.appendChild(openBtn);

      if (newWin) {
        const nw = doc.createElement("button");
        nw.type = "button";
        nw.className = "mpu-menu-newwin";
        nw.setAttribute("role", "menuitem");
        nw.textContent = "↗";
        nw.title = "Open in new window";
        nw.setAttribute("aria-label", `Open ${jump.label} in new window`);
        nw.addEventListener("click", (e) => {
          e.stopPropagation();
          navigateAdminJump(doc, ctx, jump, true, onNavigate);
        });
        row.appendChild(nw);
      }

      leaf.appendChild(row);
      sub.appendChild(leaf);
    }

    item.append(trigger, sub);
    flyout.appendChild(item);
    wireSubmenuHover(item, sub);
  }
}

async function pcodeAccess(doc: Document, parsed: ParsedPsUrl): Promise<boolean> {
  if (doc.location.href !== parsed.href || !doc.getElementById("mpu-bar")?.isConnected) return false;
  const settings = await loadSettings();
  const mapping = settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
  return doc.location.href === parsed.href && !!doc.getElementById("mpu-bar")?.isConnected && originAllowed(parsed.href, settings)
    && (!mapping || isYes(settings.environments[mapping.envId]?.active))
    && (isYes(settings.features.pageInfoOption) || (isYes(settings.features.recFieldInfoOption)
      && featureAllowedForUi(settings.featureUiScopes.recFieldInfoOption, detectUiModel(doc))));
}

function referenceButton(doc: Document, dialog: HTMLElement, parsed: ParsedPsUrl, source: "help" | "pcode", destination: "docs" | "agents", text: string): HTMLButtonElement {
  const button = doc.createElement("button"); button.type = "button"; button.className = "mpu-btn"; button.textContent = text;
  button.addEventListener("click", () => {
    if (!dialog.isConnected || doc.location.href !== parsed.href) return;
    const tools = collectPageMeta(doc).toolsRel || "";
    void getExtensionApi().runtime.sendMessage({ type: "mpu-open-reference", source, destination, uiMode: detectUiModel(doc),
      tools: /^\d{1,2}\.\d{1,2}(?:\.\d{1,3})?$/.test(tools) ? tools : "" }).then(result => {
      if (dialog.isConnected && !result?.ok) announce(doc, "Reference unavailable; check activation and feature settings or open Options.");
    }).catch(() => { if (dialog.isConnected) announce(doc, "Unable to open the local reference. Try Options."); });
  });
  return button;
}

export async function showPeopleCodeDialog(doc: Document, parsed: ParsedPsUrl): Promise<void> {
  if (!await pcodeAccess(doc, parsed)) return;
  const locked = getLockedParsedRecField();
  const hasField = Boolean(locked?.record && locked?.field);

  openModalDialog(doc, {
    labelledBy: "mpu-pcode-title",
    initialFocus: "#mpu-pcode-close",
    build: (dialog, close) => {
      const heading = doc.createElement("h2");
      heading.id = "mpu-pcode-title";
      heading.textContent = "PeopleCode starters";
      dialog.appendChild(heading);

      const hint = doc.createElement("p");
      hint.className = "mpu-dialog-hint";
      if (locked) {
        hint.textContent = "Verify the locked field's record, event and owning row/scroll context before adapting an example in App Designer. MPU cannot read or edit server PeopleCode.";
      } else {
        hint.textContent =
          "Lock the intended field with Inspect before preparing an example. MPU cannot read or edit server PeopleCode or determine the executing event and row context.";
      }
      dialog.appendChild(hint);

      const resources = doc.createElement("p");
      const promptLink = referenceButton(doc, dialog, parsed, "pcode", "agents", "Prepare a PeopleCode task with an agent");
      const docsLink = referenceButton(doc, dialog, parsed, "pcode", "docs", "Find PeopleCode API and language documentation");
      resources.append(promptLink, " · ", docsLink);
      dialog.appendChild(resources);

      if (hasField) {
        const lockedLine = doc.createElement("p");
        lockedLine.className = "mpu-dialog-hint";
        const lockedLabel = doc.createElement("strong");
        lockedLabel.textContent = "Locked field: ";
        lockedLine.append(
          lockedLabel,
          doc.createTextNode(
            `${locked!.record}.${locked!.field}${
              locked!.occurrence != null && locked!.occurrence !== ""
                ? ` (DOM occurrence ${locked!.occurrence}; not a PeopleCode row path)`
                : ""
            }`,
          ),
        );
        dialog.appendChild(lockedLine);
      }

      const examples = doc.createElement("section"); examples.id = "mpu-pcode-context-form";
      dialog.append(examples);
      bindPeopleCodeContextUI(doc, examples, { record: locked?.record, field: locked?.field, lockedId: locked?.raw },
        () => pcodeAccess(doc, parsed), text => copyText(doc, text, "Copied contextual PeopleCode example"));

      const msgHits = scanMessageKeys(doc);
      const msgsHeading = doc.createElement("h3");
      msgsHeading.textContent = "Message keys on this page";
      dialog.appendChild(msgsHeading);

      const msgsHint = doc.createElement("p");
      msgsHint.className = "mpu-dialog-hint";
      msgsHint.textContent = msgHits.length
        ? "Optional: MsgGet / translate hints found in the visible page HTML (not from App Designer)."
        : "No MsgGet / message-set text found in the visible page HTML.";
      dialog.appendChild(msgsHint);

      if (msgHits.length) {
        const msgList = doc.createElement("ul");
        msgList.className = "mpu-pcode-list";
        for (const hit of msgHits) {
          const li = doc.createElement("li");
          li.className = "mpu-pcode-item";
          const row = doc.createElement("div");
          row.className = "mpu-pcode-row";
          const strong = doc.createElement("strong");
          strong.textContent = hit.label;
          row.appendChild(strong);
          const copyMsg = doc.createElement("button");
          copyMsg.type = "button";
          copyMsg.className = "mpu-btn mpu-pcode-copy";
          copyMsg.textContent = "Copy";
          copyMsg.setAttribute("aria-label", `Copy ${hit.label}`);
          copyMsg.addEventListener("click", () => {
            void pcodeAccess(doc, parsed).then(allowed => { if (allowed && dialog.isConnected) return copyText(doc, hit.copyText, `Copied ${hit.label}`); });
          });
          row.appendChild(copyMsg);
          li.appendChild(row);
          msgList.appendChild(li);
        }
        dialog.appendChild(msgList);
      }

      const actionRow = doc.createElement("div");
      actionRow.className = "mpu-dialog-actions";

      const copyMsgs = doc.createElement("button");
      copyMsgs.type = "button";
      copyMsgs.className = "mpu-btn";
      copyMsgs.textContent = "Copy all keys";
      copyMsgs.disabled = !msgHits.length;
      copyMsgs.addEventListener("click", () => {
        void pcodeAccess(doc, parsed).then(allowed => { if (allowed && dialog.isConnected) return copyText(doc, formatMessageKeysPlain(msgHits), "Copied message keys"); });
      });

      const closeBtn = doc.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "mpu-btn";
      closeBtn.id = "mpu-pcode-close";
      closeBtn.textContent = "Close";
      closeBtn.addEventListener("click", close);

      actionRow.append(copyMsgs, closeBtn);
      dialog.appendChild(actionRow);
    },
  });
}

export function showStructureDialog(doc: Document): void {
  const nodes = collectFluidStructure(doc);
  const crefPath = detectFluidCrefPath(doc);
  const theme = detectFluidTheme(doc);
  const metaLines: string[] = [];
  if (crefPath) metaLines.push(`CREF path: ${crefPath}`);
  if (theme) metaLines.push(`Theme: ${theme}`);
  const structure = formatFluidStructurePlain(nodes);
  const text = metaLines.length ? `${metaLines.join("\n")}\n\n${structure}` : structure;

  openModalDialog(doc, {
    labelledBy: "mpu-structure-title",
    initialFocus: "#mpu-structure-close",
    build: (dialog, close) => {
      dialog.innerHTML = `
    <h2 id="mpu-structure-title">Page structure</h2>
    <p class="mpu-dialog-hint">Read-only inventory of group boxes, scroll areas, grids, and related hosts.</p>
    <pre class="mpu-pre" id="mpu-structure-body"></pre>
    <div class="mpu-dialog-actions">
      <button type="button" class="mpu-btn" id="mpu-structure-copy">Copy</button>
      <button type="button" class="mpu-btn" id="mpu-fluid-debug">Diagnose Fluid navigation</button>
      <button type="button" class="mpu-btn" id="mpu-structure-close">Close</button>
    </div>
  `;
      (dialog.querySelector("#mpu-structure-body") as HTMLElement).textContent = text;
      dialog.querySelector("#mpu-structure-close")?.addEventListener("click", close);
      dialog.querySelector("#mpu-structure-copy")?.addEventListener("click", () => {
        void copyText(doc, text, "Page structure copied");
      });
      dialog.querySelector("#mpu-fluid-debug")?.addEventListener("click", async () => {
        const parsed = parsePsUrl(doc.location.href);
        if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected) return;
        close();
        const output = formatFluidDebugSnapshot(collectFluidDebugSnapshot(doc));
        openModalDialog(doc, {
          labelledBy: "mpu-fluid-debug-title", initialFocus: "#mpu-fluid-debug-close",
          build: (debugDialog, closeDebug) => {
            debugDialog.innerHTML = '<h2 id="mpu-fluid-debug-title">Fluid navigation debugger</h2><p>Read-only frame and modal ownership clues. This does not determine whether PeopleSoft has unsaved changes.</p><pre class="mpu-pre" id="mpu-fluid-debug-output"></pre><div class="mpu-dialog-actions"><button type="button" class="mpu-btn" id="mpu-fluid-debug-copy">Copy diagnostic</button><button type="button" class="mpu-btn" id="mpu-fluid-debug-close">Close</button></div>';
            debugDialog.querySelector("#mpu-fluid-debug-output")!.textContent = output;
            debugDialog.querySelector("#mpu-fluid-debug-copy")!.addEventListener("click", () => { void copyText(doc, output, "Fluid diagnostic copied"); });
            debugDialog.querySelector("#mpu-fluid-debug-close")!.addEventListener("click", closeDebug);
          },
        });
      });
    },
  });
}

export function removeBar(doc: Document = document): void {
  closeAllFlyouts(doc);
  endBarLayoutWatch();
  clearClassicContentOffset(doc);
  doc.getElementById("mpu-bar")?.remove();
  doc.getElementById("mpu-bar-spacer")?.remove();
  doc.getElementById("mpu-live")?.remove();
  // Orphaned portaled menus (if any) after bar tear-down
  doc.querySelectorAll("body > .mpu-flyout").forEach((el) => el.remove());
}

/**
 * Classic portals absolutely position `#ptifrmtarget`. Inserting the MPU bar as a
 * previous sibling does not push that frame down — the bar paints over the top of
 * the content (Run / Process Scheduler buttons). We reserve space by nudging the
 * target's top/height after PeopleSoft's own resize.
 */
export function clearClassicContentOffset(doc: Document = document): void {
  const target = doc.getElementById("ptifrmtarget") as HTMLElement | null;
  if (!target?.dataset.mpuNudge) return;
  if (target.dataset.mpuPsTop !== undefined) {
    target.style.top = target.dataset.mpuPsTop;
  }
  if (target.dataset.mpuPsHeight !== undefined) {
    target.style.height = target.dataset.mpuPsHeight;
  }
  if (target.dataset.mpuPsMarginTop !== undefined) {
    target.style.marginTop = target.dataset.mpuPsMarginTop;
  }
  delete target.dataset.mpuNudge;
  delete target.dataset.mpuPsTop;
  delete target.dataset.mpuPsHeight;
  delete target.dataset.mpuPsMarginTop;
}

/** Push `#ptifrmtarget` below the utilities bar so page chrome is not covered. */
export function applyClassicContentOffset(doc: Document, bar: HTMLElement): void {
  const target = doc.getElementById("ptifrmtarget") as HTMLElement | null;
  if (!target || !bar.isConnected) return;

  clearClassicContentOffset(doc);

  const barRect = bar.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  // Only reserve space when the bar strip actually covers the content frame
  // (above-content mount). documentTop with no overlap is a no-op.
  const overlap = Math.ceil(barRect.bottom - targetRect.top);
  if (overlap <= 0) return;

  const cs = doc.defaultView?.getComputedStyle(target) ?? getComputedStyle(target);
  if (cs.position === "absolute" || cs.position === "fixed") {
    target.dataset.mpuPsTop = target.style.top;
    target.dataset.mpuPsHeight = target.style.height;
    const top = parseFloat(cs.top) || 0;
    const height = parseFloat(cs.height) || targetRect.height;
    target.style.top = `${top + overlap}px`;
    if (height > 0) {
      target.style.height = `${Math.max(50, height - overlap)}px`;
    }
    target.dataset.mpuNudge = String(overlap);
    return;
  }

  target.dataset.mpuPsMarginTop = target.style.marginTop;
  const mt = parseFloat(cs.marginTop) || 0;
  target.style.marginTop = `${mt + overlap}px`;
  target.dataset.mpuNudge = String(overlap);
}

/** ResizeObserver / window listeners that keep Classic content clear of the bar. */
let barLayoutObserver: ResizeObserver | null = null;
let barLayoutAbort: AbortController | null = null;

function endBarLayoutWatch(): void {
  barLayoutObserver?.disconnect();
  barLayoutObserver = null;
  barLayoutAbort?.abort();
  barLayoutAbort = null;
}

function scheduleClassicLayoutSync(doc: Document, bar: HTMLElement): void {
  injectResizeFrame(doc, () => applyClassicContentOffset(doc, bar));
}

function watchBarLayoutForClassicResize(bar: HTMLElement, doc: Document): void {
  endBarLayoutWatch();
  const ac = new AbortController();
  barLayoutAbort = ac;
  const view = doc.defaultView;

  view?.addEventListener(
    "resize",
    () => {
      scheduleClassicLayoutSync(doc, bar);
    },
    { signal: ac.signal },
  );

  if (typeof ResizeObserver === "undefined") return;
  let lastH = Math.round(bar.getBoundingClientRect().height);
  barLayoutObserver = new ResizeObserver(() => {
    const h = Math.round(bar.getBoundingClientRect().height);
    if (h <= 0 || h === lastH) return;
    lastH = h;
    // Bar wrap/unwrap only — restore PS baseline then re-reserve the new height
    applyClassicContentOffset(doc, bar);
  });
  barLayoutObserver.observe(bar);
}

export function mountBar(ctx: BarContext, doc: Document = document): void {
  const previousAnnouncement = doc.getElementById("mpu-live")?.textContent;
  removeBar(doc);
  const f = ctx.settings.features;
  const loginOnly = Boolean(ctx.loginMode);
  const environment = environmentForPage(ctx.settings, ctx.parsed).environment;
  const production = environment?.classification === "production";
  const placement = production || ctx.settings.barPlacement === "documentTop" ? "documentTop" : "aboveContent";
  const sticky = production || isYes(ctx.settings.barSticky);
  const mount = findHeaderMount(doc, { loginMode: loginOnly });
  if (!mount) return;

  const classicTarget = mount.id === "ptifrmtarget" ? mount : null;

  const bar = document.createElement("div");
  bar.id = "mpu-bar";
  bar.className = classicTarget || placement === "documentTop" ? "mpu-bar mpu-bar-classic" : "mpu-bar";
  if (placement === "documentTop") bar.classList.add("mpu-bar-document-top");
  if (sticky) bar.classList.add("mpu-bar-sticky");
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Morris PeopleSoft Utilities");
  bar.dataset.mpuPlacement = placement;
  bar.dataset.mpuSticky = sticky ? "Yes" : "No";

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
    const badge = doc.createElement("span");
    badge.id = "mpu-environment-classification";
    badge.className = production ? "mpu-production-badge" : "mpu-mode";
    badge.textContent = production ? "PRODUCTION" : environment?.classification === "non-production" ? "Non-production" : "Unclassified";
    badge.title = "Explicit environment classification in Options → Environments";
    bar.append(badge);
  }

  if (!loginOnly) {
    const mode = document.createElement("span");
    mode.className = "mpu-mode";
    mode.id = "mpu-ui-mode";
    mode.textContent = uiModeLabel(doc);
    mode.title = "PeopleSoft UI model (Classic / Fluid / Nav collection)";
    bar.appendChild(mode);
  }

  if (isYes(f.greetingOption)) {
    const envRoot = document.createElement("span");
    envRoot.className = "mpu-menu-root";

    const env = document.createElement("button");
    env.type = "button";
    env.id = "mpu-env";
    env.className = "mpu-env";
    env.textContent = ctx.envLabel || ctx.parsed.siteNormalized || "Environment";
    env.title = "Environment context (site, portal, node, ToolsRel, theme, CREF)";
    env.setAttribute(
      "aria-label",
      `Environment ${env.textContent}. Open environment context.`,
    );
    env.setAttribute("aria-haspopup", "dialog");
    env.setAttribute("aria-expanded", "false");
    const color = environment?.color;
    if (color) {
      env.style.setProperty("--mpu-env-color", color);
      env.setAttribute("data-mpu-env-colored", "true");
    }

    const envFlyout = document.createElement("div");
    envFlyout.className = "mpu-flyout mpu-env-flyout";
    envFlyout.id = "mpu-env-flyout";
    envFlyout.setAttribute("role", "dialog");
    envFlyout.setAttribute("aria-label", "Environment context");
    envFlyout.hidden = true;

    const fillEnvFlyout = (): void => {
      envFlyout.replaceChildren();
      const meta = collectPageMeta(doc);
      const rows = buildEnvContextRows(meta, ctx.parsed, ctx.envLabel || "", doc);
      const dl = document.createElement("dl");
      dl.className = "mpu-env-dl";
      for (const row of rows) {
        const dt = document.createElement("dt");
        dt.textContent = row.label;
        const dd = document.createElement("dd");
        dd.textContent = row.value;
        dl.append(dt, dd);
      }
      envFlyout.appendChild(dl);

      const actions = document.createElement("div");
      actions.className = "mpu-flyout-actions";
      const copyBtn = btn("mpu-env-copy", "Copy", "Copy environment context");
      copyBtn.addEventListener("click", () => {
        void copyText(
          doc,
          formatEnvContextPlain(meta, ctx.parsed, ctx.envLabel || "", doc),
          "Environment context copied",
        );
      });
      actions.appendChild(copyBtn);
      envFlyout.appendChild(actions);
    };

    const closeEnv = (): void => {
      if (envFlyout.contains(doc.activeElement)) env.focus();
      envFlyout.hidden = true;
      env.setAttribute("aria-expanded", "false");
      endFlyoutPosition();
      restorePortaledFlyout(envFlyout);
      endMenuDismiss();
    };

    const openEnv = (): void => {
      closeAllFlyouts(doc);
      fillEnvFlyout();
      envFlyout.hidden = false;
      env.setAttribute("aria-expanded", "true");
      bindFlyoutPosition(env, envFlyout);
      bindMenuDismiss(doc, envRoot, closeEnv, envFlyout);
      envFlyout.querySelector<HTMLElement>("button")?.focus();
    };

    env.addEventListener("click", () => {
      if (envFlyout.hidden) openEnv();
      else closeEnv();
    });

    envRoot.append(env, envFlyout);
    bar.appendChild(envRoot);
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
    const menuRoot = document.createElement("span");
    menuRoot.className = "mpu-menu-root";

    const shortcutsBtn = btn("mpu-fav", "Shortcuts", "Open shortcuts menu");
    shortcutsBtn.setAttribute("aria-haspopup", "dialog");
    shortcutsBtn.setAttribute("aria-expanded", "false");

    const flyout = document.createElement("div");
    flyout.className = "mpu-flyout";
    flyout.setAttribute("role", "dialog");
    flyout.setAttribute("aria-label", "Shortcuts");
    flyout.hidden = true;

    const filter = document.createElement("input");
    filter.type = "search";
    filter.id = "mpu-fav-filter";
    filter.className = "mpu-fav-filter mpu-flyout-filter";
    filter.placeholder = "Filter…";
    filter.setAttribute("aria-label", "Filter shortcuts");
    filter.autocomplete = "off";

    const menuBody = document.createElement("div");
    menuBody.className = "mpu-flyout-body";
    menuBody.setAttribute("role", "menu");
    menuBody.setAttribute("aria-label", "Shortcut actions");

    const closeShortcuts = (): void => {
      if (flyout.contains(doc.activeElement)) shortcutsBtn.focus();
      flyout.hidden = true;
      shortcutsBtn.setAttribute("aria-expanded", "false");
      endFlyoutPosition();
      restorePortaledFlyout(flyout);
      endMenuDismiss();
    };

    const openShortcuts = (): void => {
      closeAllFlyouts(doc);
      buildShortcutsFlyoutBody(doc, menuBody, ctx, filter.value, closeShortcuts);
      flyout.hidden = false;
      shortcutsBtn.setAttribute("aria-expanded", "true");
      bindFlyoutPosition(shortcutsBtn, flyout);
      bindMenuDismiss(doc, menuRoot, closeShortcuts, flyout);
      filter.focus();
    };

    filter.addEventListener("input", () => {
      buildShortcutsFlyoutBody(doc, menuBody, ctx, filter.value, closeShortcuts);
      if (!flyout.hidden) bindFlyoutPosition(shortcutsBtn, flyout);
    });
    filter.addEventListener("click", (e) => e.stopPropagation());

    flyout.append(filter, menuBody);
    buildShortcutsFlyoutBody(doc, menuBody, ctx, "", closeShortcuts);

    shortcutsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!flyout.hidden) {
        closeShortcuts();
        return;
      }
      openShortcuts();
    });

    menuRoot.append(shortcutsBtn, flyout);
    bar.appendChild(menuRoot);

    const recent = ctx.settings.recentComponents || [];
    if (recent.length) {
      const wrap = document.createElement("span");
      wrap.className = "mpu-fav-wrap";

      if (isYes(f.newWindowOption)) {
        const lab = document.createElement("label");
        lab.className = "mpu-fav-newwin";
        lab.title = "Open selected recent component in a new window";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = "mpu-fav-newwin";
        lab.append(cb, document.createTextNode(" New win"));
        wrap.appendChild(lab);
      }

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
      bar.appendChild(wrap);
    }
  }

  if (!loginOnly && isYes(f.traceOption)) {
    const traceHint = formatTraceBarHint(ctx.settings.traceSettings);
    const traceSummary = summarizeActiveTraceFlags(ctx.settings.traceSettings);
    const evidence = describeTraceRequest(ctx.traceRequest, ctx.parsed);
    const label = ctx.traceLocked ? "Trace 🔒 · unknown" : `${evidence.label}${traceHint ? ` · ${traceHint}` : ""}`;
    const title = ctx.traceLocked
      ? "Trace locked — your user likely lacks access to UTILITIES PeopleCode/SQL Trace components (see FAQ)"
      : traceHint
        ? `${evidence.detail} Configured flags: ${traceSummary}`
        : evidence.detail;
    const t = btn("mpu-trace", label, title);
    t.disabled = evidence.status === "requested";
    t.setAttribute("aria-haspopup", "dialog");
    t.addEventListener("click", () => {
      if (ctx.onTraceRequest) showTraceRequestDialog(doc, ctx);
      else ctx.onTraceToggle();
    });
    bar.appendChild(t);
  }

  if (!loginOnly && isYes(f.pageInfoOption)) {
    const p = btn("mpu-pageinfo", "Page Info", "Show page information (Alt+Shift+P)");
    p.addEventListener("click", () => ctx.onPageInfo());
    bar.appendChild(p);
  }

  if (
    !loginOnly &&
    (isYes(f.pageInfoOption) || isYes(f.recFieldInfoOption))
  ) {
    const pcode = btn(
      "mpu-pcode",
      "PCode",
      "Copy PeopleCode starters for App Designer (lock a field with Inspect first)",
    );
    pcode.addEventListener("click", () => { if (bar.isConnected) void showPeopleCodeDialog(doc, ctx.parsed); });
    bar.appendChild(pcode);
  }


  if (!loginOnly && isYes(f.pageInfoOption)) {
    const ibCrumb = collectIbBreadcrumb(doc, ctx.parsed);
    if (ibCrumb) {
      const ibChip = document.createElement("span");
      ibChip.className = "mpu-ib-crumb";
      ibChip.id = "mpu-ib-crumb";
      ibChip.textContent = ibCrumb.summary;
      ibChip.title = "Integration Broker context (visible DOM only)";
      const copyIb = btn("mpu-ib-copy", "Copy IB", "Copy IB breadcrumb");
      copyIb.addEventListener("click", () => {
        void copyText(doc, formatIbBreadcrumbPlain(ibCrumb), "IB breadcrumb copied");
      });
      const wrap = document.createElement("span");
      wrap.className = "mpu-ib-wrap";
      wrap.append(ibChip, copyIb);
      bar.appendChild(wrap);
    }
  }
  if (!loginOnly && isYes(f.pageInfoOption)) {
    const structure = btn("mpu-structure", "Structure", "Fluid / Classic page structure inventory");
    structure.addEventListener("click", () => showStructureDialog(doc));
    bar.appendChild(structure);
  }

  if (
    !loginOnly &&
    isYes(f.pageInfoOption) &&
    ctx.parsed.baseURL &&
    ctx.parsed.portal &&
    ctx.parsed.node
  ) {
    const adminRoot = document.createElement("span");
    adminRoot.className = "mpu-menu-root";

    const adminBtn = btn("mpu-admin", "Admin", "Jump to common setup components");
    adminBtn.setAttribute("aria-haspopup", "menu");
    adminBtn.setAttribute("aria-expanded", "false");

    const adminFlyout = document.createElement("div");
    adminFlyout.className = "mpu-flyout";
    adminFlyout.setAttribute("role", "menu");
    adminFlyout.setAttribute("aria-label", "Admin jumps");
    adminFlyout.hidden = true;

    const closeAdmin = (): void => {
      if (adminFlyout.contains(doc.activeElement)) adminBtn.focus();
      adminFlyout.hidden = true;
      adminBtn.setAttribute("aria-expanded", "false");
      endFlyoutPosition();
      restorePortaledFlyout(adminFlyout);
      endMenuDismiss();
    };

    const openAdmin = (): void => {
      closeAllFlyouts(doc);
      buildAdminFlyoutBody(doc, adminFlyout, ctx, closeAdmin);
      adminFlyout.hidden = false;
      adminBtn.setAttribute("aria-expanded", "true");
      bindFlyoutPosition(adminBtn, adminFlyout);
      bindMenuDismiss(doc, adminRoot, closeAdmin, adminFlyout);
      const first = adminFlyout.querySelector<HTMLElement>('button[role="menuitem"]');
      first?.focus();
    };

    adminBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!adminFlyout.hidden) {
        closeAdmin();
        return;
      }
      openAdmin();
    });

    buildAdminFlyoutBody(doc, adminFlyout, ctx, closeAdmin);
    adminRoot.append(adminBtn, adminFlyout);
    bar.appendChild(adminRoot);
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

  if (!loginOnly && isYes(f.fieldEntryOption)) {
    const entryRoot = document.createElement("span");
    entryRoot.className = "mpu-menu-root";

    const bufLen = getSessionBuffer().length;
    const entryBtn = btn(
      "mpu-entry",
      bufLen ? `Entry (${bufLen})` : "Entry",
      "Field Entry toolkit — capture, paste, sheet, find/replace (Alt+Shift+E)",
    );
    entryBtn.setAttribute("aria-haspopup", "menu");
    entryBtn.setAttribute("aria-expanded", "false");

    const entryFlyout = document.createElement("div");
    entryFlyout.className = "mpu-flyout";
    entryFlyout.setAttribute("role", "menu");
    entryFlyout.setAttribute("aria-label", "Field Entry");
    entryFlyout.hidden = true;

    const closeEntry = (): void => {
      if (entryFlyout.contains(doc.activeElement)) entryBtn.focus();
      entryFlyout.hidden = true;
      entryBtn.setAttribute("aria-expanded", "false");
      endFlyoutPosition();
      restorePortaledFlyout(entryFlyout);
      endMenuDismiss();
    };

    const addEntryItem = (label: string, title: string, onClick: () => void): void => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "mpu-btn";
      item.setAttribute("role", "menuitem");
      item.textContent = label;
      item.title = title;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        closeEntry();
        onClick();
      });
      entryFlyout.appendChild(item);
    };

    const buildEntryFlyout = (): void => {
      entryFlyout.replaceChildren();
      addEntryItem("Capture", "Copy editable field values into the session buffer", () =>
        runCapture(doc),
      );
      addEntryItem("Paste…", "Preview session buffer against this page, then apply", () =>
        runPastePreview(doc),
      );
      addEntryItem("From sheet…", "Paste TSV/CSV header + one data row", () =>
        showSheetPasteDialog(doc),
      );
      addEntryItem("Find / Replace…", "Replace matching field values with preview", () =>
        showFindReplaceDialog(doc),
      );
      addEntryItem("Save profile…", "Save session buffer as a named local profile", () =>
        showSaveProfileDialog(doc, ctx.settings),
      );
      addEntryItem("Load profile…", "Load a saved profile into the buffer and preview", () =>
        showLoadProfileDialog(doc, ctx.settings),
      );
      addEntryItem("Clear buffer", "Clear session buffer and highlights", () =>
        clearBufferAndPreview(doc),
      );
    };

    const openEntry = (): void => {
      closeAllFlyouts(doc);
      buildEntryFlyout();
      entryFlyout.hidden = false;
      entryBtn.setAttribute("aria-expanded", "true");
      bindFlyoutPosition(entryBtn, entryFlyout);
      bindMenuDismiss(doc, entryRoot, closeEntry, entryFlyout);
      const first = entryFlyout.querySelector<HTMLElement>('button[role="menuitem"]');
      first?.focus();
    };

    entryBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!entryFlyout.hidden) {
        closeEntry();
        return;
      }
      openEntry();
    });

    buildEntryFlyout();
    entryRoot.append(entryBtn, entryFlyout);
    bar.appendChild(entryRoot);
  }

  if (!loginOnly && isYes(f.pageInfoOption)) {
    const pagesRoot = document.createElement("span");
    pagesRoot.className = "mpu-menu-root";

    const pagesBtn = btn(
      "mpu-pagetabs",
      "Pages",
      "List all component pages and tabs on this component",
    );
    pagesBtn.setAttribute("aria-haspopup", "menu");
    pagesBtn.setAttribute("aria-expanded", "false");

    const pagesFlyout = document.createElement("div");
    pagesFlyout.className = "mpu-flyout";
    pagesFlyout.setAttribute("role", "menu");
    pagesFlyout.setAttribute("aria-label", "Pages");
    pagesFlyout.hidden = true;

    const closePages = (): void => {
      if (pagesFlyout.contains(doc.activeElement)) pagesBtn.focus();
      pagesFlyout.hidden = true;
      pagesBtn.setAttribute("aria-expanded", "false");
      endFlyoutPosition();
      restorePortaledFlyout(pagesFlyout);
      endMenuDismiss();
    };

    const openPages = (): void => {
      closeAllFlyouts(doc);
      populatePagesMenu(doc, pagesFlyout, closePages);
      pagesFlyout.hidden = false;
      pagesBtn.setAttribute("aria-expanded", "true");
      bindFlyoutPosition(pagesBtn, pagesFlyout);
      bindMenuDismiss(doc, pagesRoot, closePages, pagesFlyout);
      const first = pagesFlyout.querySelector<HTMLElement>(
        'button[role="menuitem"]:not(:disabled)',
      );
      first?.focus();
    };

    pagesBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!pagesFlyout.hidden) {
        closePages();
        return;
      }
      openPages();
    });

    pagesRoot.append(pagesBtn, pagesFlyout);
    bar.appendChild(pagesRoot);
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

  if (!loginOnly) {
    const agents = btn("mpu-agents", "Agents", "Open the local Agents reference library");
    agents.addEventListener("click", () => {
      // Keep the message in the click's user gesture; the worker validates current settings.
      const mapping = ctx.settings.urlSites[ctx.parsed.baseURL]?.[ctx.parsed.siteNormalized];
      if (!bar.isConnected || !originAllowed(ctx.parsed.href, ctx.settings)
        || (mapping && !isYes(ctx.settings.environments[mapping.envId]?.active))) return;
      void getExtensionApi().runtime.sendMessage({ type: "mpu-open-agents" }).then((result) => {
        if (bar.isConnected && !result?.ok) announce(doc, "Agents library unavailable; try again after settings finish updating");
      }).catch(() => {
        if (bar.isConnected) announce(doc, "Unable to open the Agents library");
      });
    });
    bar.appendChild(agents);
  }

  const help = btn("mpu-help", "?", "Help");
  help.addEventListener("click", () => showHelpDialog(doc));
  bar.appendChild(help);

  bar.querySelectorAll<HTMLElement>('button[aria-haspopup="menu"], #mpu-fav').forEach((trigger) => {
    trigger.addEventListener("keydown", (e) => {
      if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
      e.preventDefault();
      if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();
      const flyout = doc.querySelector('.mpu-flyout:not([hidden])');
      const menu = flyout?.matches('[role="menu"]') ? flyout : flyout?.querySelector('[role="menu"]');
      const items = Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])
        .filter((item) => item.closest('[role="menu"]') === menu && isVisible(item));
      (e.key === "ArrowUp" ? items.at(-1) : items[0])?.focus();
    });
  });

  if (placement === "documentTop" && doc.body) {
    doc.body.insertBefore(bar, doc.body.firstChild);
  } else if (classicTarget?.parentElement) {
    classicTarget.parentElement.insertBefore(bar, classicTarget);
  } else if (loginOnly && mount !== doc.body && mount.parentElement) {
    // SP-08: insert above password form container, not inside it
    mount.parentElement.insertBefore(bar, mount);
  } else if (mount === doc.body) {
    mount.insertBefore(bar, mount.firstChild);
  } else {
    mount.appendChild(bar);
  }

  // Classic: `#ptifrmtarget` is usually position:absolute, so the in-flow bar would
  // otherwise paint over Run / Process Scheduler controls. resizeAll first (PS
  // baseline), then reserve the measured bar height. Skip resizeAll while Field
  // Inspector is active — it can rebuild the iframe and wipe icons.
  if (classicTarget) {
    applyClassicContentOffset(doc, bar);
    viewRaf(doc, () => applyClassicContentOffset(doc, bar));
    if (!ctx.fieldInspectorActive) {
      scheduleClassicLayoutSync(doc, bar);
    }
    watchBarLayoutForClassicResize(bar, doc);
  }

  doc.body.appendChild(live);
  announce(doc, previousAnnouncement || "Morris PeopleSoft Utilities bar ready");
}

function viewRaf(doc: Document, fn: () => void): void {
  const view = doc.defaultView;
  if (!view) {
    fn();
    return;
  }
  view.requestAnimationFrame(() => {
    view.requestAnimationFrame(fn);
  });
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

  const backdrop = doc.createElement("div");
  backdrop.id = "mpu-dialog";
  backdrop.className = "mpu-dialog-backdrop";
  backdrop.setAttribute("role", "presentation");

  const dialog = doc.createElement("div");
  dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", opts.labelledBy);

  const close = bindModalDialog(doc, backdrop, dialog);

  opts.build(dialog, close);
  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
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
      <li><strong>Shortcuts</strong> — hierarchical menu by category; Add to Shortcuts from the flyout</li>
      <li><strong>Page Info</strong> — menu/component/page; Compare clipboard across envs; <strong>Upgrade watch</strong> compares UI fingerprints after PS upgrades (not PeopleCode)</li>
      <li><strong>Pages</strong> — delivered multi-page links when present (flyout or full list)</li>
      <li><strong>Field Inspector</strong> — orange icons; PeopleCode copy formats; Alt+Shift+C</li>
      <li><strong>Entry</strong> — capture / paste / sheet / find-replace with eligibility preview (Alt+Shift+E; Options → careful)</li>
      <li><strong>PCode / Structure / Admin</strong> — App Designer starters, page structure tree, setup jumps</li>
      <li><strong>Go to</strong> — jump to Menu.Component.Market</li>
      <li><strong>Trace</strong> — toggle configured PeopleCode/SQL flags</li>
      <li><strong>Shortcuts</strong> — Alt+Shift+P/I/C/G/E</li>
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

      const agentHelp = doc.createElement("section");
      agentHelp.id = "mpu-agent-help";
      appendAgentHelp(doc, agentHelp);
      dialog.querySelector("#mpu-dialog-close")?.before(agentHelp);
      const docsHelp = doc.createElement("p");
      const docsLink = referenceButton(doc, dialog, parsePsUrl(doc.location.href), "help", "docs", "Oracle documentation hub (PeopleTools version-aware)");
      docsHelp.append(docsLink);
      dialog.querySelector("#mpu-dialog-close")?.before(docsHelp);
      dialog.querySelector("#mpu-dialog-close")?.addEventListener("click", close);
    },
  });
}

/** Explicit requests never infer live server state from the saved boolean. */
function showTraceRequestDialog(doc: Document, ctx: BarContext): void {
  openModalDialog(doc, {
    labelledBy: "mpu-trace-title", initialFocus: "#mpu-trace-close",
    build: (dialog, close) => {
      dialog.innerHTML = `<h2 id="mpu-trace-title">Trace requests</h2>
        <p id="mpu-trace-evidence"></p>
        <p>On applies your configured flags. Off requests that both PeopleCode and SQL tracing stop. Verify in PeopleSoft after either request.</p>
        <div class="mpu-dialog-actions">
          <button type="button" class="mpu-btn" id="mpu-trace-on">Request trace on</button>
          <button type="button" class="mpu-btn" id="mpu-trace-off">Request trace off</button>
          <button type="button" class="mpu-btn" id="mpu-trace-close">Close</button>
        </div>`;
      dialog.querySelector("#mpu-trace-evidence")!.textContent = describeTraceRequest(ctx.traceRequest, ctx.parsed).detail;
      for (const target of ["on", "off"] as const) dialog.querySelector(`#mpu-trace-${target}`)!.addEventListener("click", async () => {
        if (!await currentPageAccess(ctx.parsed, "traceOption") || !dialog.isConnected) { close(); return; }
        close();
        ctx.onTraceRequest?.(target === "on");
      });
      dialog.querySelector("#mpu-trace-close")!.addEventListener("click", close);
    },
  });
}

/** CSP-safe Pages list from delivered links (SP-01). */
export function showPageTabsDialog(doc: Document): void {
  openModalDialog(doc, {
    labelledBy: "mpu-tabs-title",
    initialFocus: "#mpu-tabs-close",
    build: (dialog, close) => {
      const tabs = collectPageTabs(doc);
      const list = tabs.length
        ? `<ul class="mpu-page-tabs-list" id="mpu-tabs-list" role="menu" aria-label="Pages"></ul>`
        : `<p>No delivered page/tab links found on this page.</p>`;

      dialog.innerHTML = `
    <h2 id="mpu-tabs-title">Pages</h2>
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
          li.setAttribute("role", "none");
          const b = doc.createElement("button");
          b.type = "button";
          b.className = "mpu-btn mpu-menu-open";
          b.setAttribute("role", "menuitem");
          b.textContent = tab.label;
          if (tab.current) {
            b.classList.add("mpu-menu-current");
            b.setAttribute("aria-current", "page");
            b.disabled = true;
          } else {
            b.addEventListener("click", () => {
              tab.el.click();
              announce(doc, `Activated tab ${tab.label}`);
              close();
            });
          }
          li.appendChild(b);
          ul.appendChild(li);
        }
      }

      dialog.querySelector("#mpu-tabs-close")?.addEventListener("click", close);
    },
  });
}

export function showPageInfoDialog(
  doc: Document,
  parsed: ParsedPsUrl,
  lockedField?: string | null,
  envLabel?: string,
): void {
  const meta = collectPageMeta(doc);
  const text = formatPageInfoPlain(meta, parsed, lockedField);
  const markdown = formatPageInfoMarkdown(meta, parsed, lockedField);
  const objectPack = formatObjectPackPlain({ parsed, meta, lockedField, doc });
  const objectPackMd = formatObjectPackMarkdown({ parsed, meta, lockedField });

  openModalDialog(doc, {
    labelledBy: "mpu-pi-title",
    initialFocus: "#mpu-pi-close",
    build: (dialog, close) => {
      dialog.innerHTML = `
    <h2 id="mpu-pi-title">Page Information</h2>
    <pre class="mpu-pre" id="mpu-pi-body"></pre>
    <pre class="mpu-pre mpu-pre-diff" id="mpu-pi-diff" hidden></pre>
    <div class="mpu-dialog-section" id="mpu-pi-watch-section">
      <h3>Customization upgrade watch</h3>
      <button type="button" class="mpu-btn" id="mpu-pi-prepare-comparison">Prepare environment snapshot</button>
      <p class="mpu-dialog-hint">Review before saving locally, then select two snapshots in Options → Compare environments. This compares captured browser UI metadata only.</p>
      <p class="mpu-dialog-hint">Capture a UI fingerprint before a PeopleTools upgrade; check again after to spot tab, structure, or field-id drift. Captures only the current loaded page, up to 200 unique field IDs and 40 structure hosts. Unloaded tabs, PeopleCode, SQL and database changes are not compared.</p>
      <label class="mpu-dialog-label">Notes (optional)
        <input type="text" class="mpu-dialog-input" id="mpu-pi-watch-notes" autocomplete="off" />
      </label>
      <label class="mpu-dialog-label">Baseline for comparison
        <select id="mpu-pi-baseline" class="mpu-dialog-input"><option value="">Choose a saved baseline</option></select>
      </label>
      <div class="mpu-dialog-actions">
        <button type="button" class="mpu-btn" id="mpu-pi-watch-save">Capture baseline</button>
        <button type="button" class="mpu-btn" id="mpu-pi-check-drift">Check upgrade drift</button>
        <button type="button" class="mpu-btn" id="mpu-pi-copy-handoff" hidden>Copy upgrade handoff</button>
      </div>
      <p class="mpu-dialog-hint">Retains up to five baselines per component/environment and 50 total. Review the selected environment and date before comparing.</p>
    </div>
    <div class="mpu-dialog-section">
      <button type="button" class="mpu-btn" id="mpu-pi-diagnostics">Preview diagnostics</button>
      <section id="mpu-diagnostics-preview" hidden aria-label="Diagnostic report preview">
        <p>Review and edit this local summary before sharing. No field values, hostnames, user IDs or session tokens are included automatically.</p>
        <label class="mpu-dialog-label">Diagnostic report<textarea id="mpu-diagnostic-report" class="mpu-dialog-input" rows="10"></textarea></label>
        <div class="mpu-dialog-actions"><button type="button" class="mpu-btn" id="mpu-diagnostic-copy">Copy diagnostic report</button>
        <button type="button" class="mpu-btn" id="mpu-diagnostic-download">Download diagnostic report</button></div>
      </section>
    </div>
    <div class="mpu-dialog-actions mpu-dialog-actions-stack">
      <div class="mpu-action-group" role="group" aria-label="Copy page info">
        <button type="button" class="mpu-btn" id="mpu-pi-copy">Copy</button>
        <button type="button" class="mpu-btn" id="mpu-pi-copy-md">Copy Markdown</button>
        <button type="button" class="mpu-btn" id="mpu-pi-copy-pack">Copy object pack</button>
        <button type="button" class="mpu-btn" id="mpu-pi-copy-pack-md">Copy pack MD</button>
        <button type="button" class="mpu-btn" id="mpu-pi-copy-process" hidden>Copy process pack</button>
      </div>
      <div class="mpu-action-group" role="group" aria-label="Compare">
        <button type="button" class="mpu-btn" id="mpu-pi-compare">Compare clipboard</button>
        <button type="button" class="mpu-btn" id="mpu-pi-compare-pack">Compare object pack</button>
      </div>
      <div class="mpu-action-group mpu-action-group-end">
        <button type="button" class="mpu-btn" id="mpu-pi-close">Close</button>
      </div>
    </div>
  `;
      (dialog.querySelector("#mpu-pi-body") as HTMLElement).textContent = text;
      const baselineSelect = dialog.querySelector("#mpu-pi-baseline") as HTMLSelectElement;
      let handoff = "";
      const resetHandoff = () => { handoff = ""; (dialog.querySelector("#mpu-pi-copy-handoff") as HTMLElement).hidden = true; };
      baselineSelect.addEventListener("change", resetHandoff);
      const refreshBaselines = async (selectedId?: string) => {
        const settings = await currentPageAccess(parsed, "pageInfoOption");
        if (!settings || !dialog.isConnected) return;
        baselineSelect.replaceChildren();
        const blank = doc.createElement("option"); blank.value = ""; blank.textContent = "Choose a saved baseline";
        baselineSelect.append(blank);
        for (const watch of listWatchesForParsed(settings.customizationWatches, parsed)) {
          const option = doc.createElement("option"); option.value = watch.id;
          option.textContent = `${watch.envLabel || "Unlabelled"} · ${new Date(watch.capturedAt).toLocaleString()} · Tools ${watch.baseline.toolsRel || "unknown"}`;
          baselineSelect.append(option);
        }
        baselineSelect.value = selectedId || findWatchForParsed(settings.customizationWatches, parsed, envLabel)?.id || "";
        resetHandoff();
      };
      void refreshBaselines();
      dialog.querySelector("#mpu-pi-diagnostics")!.addEventListener("click", async () => {
        const settings = await currentPageAccess(parsed, "pageInfoOption");
        if (!settings || !dialog.isConnected) return;
        const envId = settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized]?.envId;
        const request = envId === undefined ? undefined : settings.environments[envId]?.traceRequest;
        const area = dialog.querySelector("#mpu-diagnostic-report") as HTMLTextAreaElement;
        area.value = buildDiagnosticReport(settings, { version: getExtensionApi().runtime.getManifest().version,
          toolsRel: meta.toolsRel, uiMode: detectUiModel(doc), traceStatus: describeTraceRequest(request, parsed).status });
        (dialog.querySelector("#mpu-diagnostics-preview") as HTMLElement).hidden = false;
        area.focus(); area.setSelectionRange(0, 0); area.scrollTop = 0;
      });
      dialog.querySelector("#mpu-diagnostic-copy")!.addEventListener("click", async () => {
        if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected) return;
        await copyText(doc, (dialog.querySelector("#mpu-diagnostic-report") as HTMLTextAreaElement).value, "Reviewed diagnostic report copied");
      });
      dialog.querySelector("#mpu-diagnostic-download")!.addEventListener("click", async () => {
        if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected) return;
        const contents = (dialog.querySelector("#mpu-diagnostic-report") as HTMLTextAreaElement).value;
        const url = URL.createObjectURL(new Blob([contents], { type: "text/plain" }));
        const link = doc.createElement("a"); link.href = url; link.download = "mpu-diagnostics.txt";
        link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
        announce(doc, "Reviewed diagnostic report downloaded");
      });
      dialog.querySelector("#mpu-pi-copy-handoff")!.addEventListener("click", async () => {
        if (handoff && await currentPageAccess(parsed, "pageInfoOption") && dialog.isConnected) await copyText(doc, handoff, "Upgrade handoff copied");
      });
      dialog.querySelector("#mpu-pi-close")?.addEventListener("click", close);
      dialog.querySelector("#mpu-pi-copy")?.addEventListener("click", () => {
        void copyText(doc, text, "Page information copied");
      });
      dialog.querySelector("#mpu-pi-copy-md")?.addEventListener("click", () => {
        void copyText(doc, markdown, "Markdown page info copied");
      });
      dialog.querySelector("#mpu-pi-copy-pack")?.addEventListener("click", () => {
        void copyText(doc, objectPack, "Object pack copied");
      });
      dialog.querySelector("#mpu-pi-copy-pack-md")?.addEventListener("click", () => {
        void copyText(doc, objectPackMd, "Object pack Markdown copied");
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
      const ibCrumb = collectIbBreadcrumb(doc, parsed);
      if (ibCrumb) {
        const ibLine = doc.createElement("p");
        ibLine.className = "mpu-dialog-hint";
        ibLine.textContent = `IB: ${ibCrumb.summary}`;
        const investigateIb = doc.createElement("button");
        investigateIb.type = "button";
        investigateIb.className = "mpu-btn";
        investigateIb.id = "mpu-pi-ib";
        investigateIb.textContent = "Investigate sanitized IB samples";
        investigateIb.addEventListener("click", () => {
          void (async () => {
            if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected) return;
            const result = await getExtensionApi().runtime.sendMessage({ type: "mpu-open-ib" });
            if (!result?.ok && dialog.isConnected) announce(doc, "IB workspace unavailable; try Options → Integration Broker");
          })().catch(() => { if (dialog.isConnected) announce(doc, "Unable to open the IB workspace"); });
        });
        ibLine.append(" ", investigateIb);
        dialog.querySelector("#mpu-pi-body")?.insertAdjacentElement("afterend", ibLine);
      }

      const processPack = collectProcessPack(doc, parsed);
      const processBtn = dialog.querySelector("#mpu-pi-copy-process") as HTMLButtonElement | null;
      if (processBtn && isProcessMonitorPage(doc, parsed)) {
        processBtn.hidden = false;
        processBtn.disabled = !processPack;
        if (!processPack) {
          const warning = doc.createElement("p"); warning.className = "mpu-dialog-hint";
          warning.textContent = "No unambiguous process context is available. Select one process row or open its details, then reopen Page Info. Fields from different rows were not combined.";
          processBtn.insertAdjacentElement("afterend", warning);
        }
        const investigate = doc.createElement("button");
        investigate.type = "button";
        investigate.className = "mpu-btn";
        investigate.id = "mpu-pi-scheduler";
        investigate.textContent = "Investigate sanitized Scheduler logs";
        investigate.addEventListener("click", () => {
          void (async () => {
            if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected) return;
            const result = await getExtensionApi().runtime.sendMessage({ type: "mpu-open-scheduler" });
            if (!result?.ok && dialog.isConnected) announce(doc, "Scheduler workspace unavailable; try Options → Process Scheduler");
          })().catch(() => { if (dialog.isConnected) announce(doc, "Unable to open the Scheduler workspace"); });
        });
        processBtn.insertAdjacentElement("afterend", investigate);
        const packText = processPack ? formatProcessPackPlain(processPack) : "";
        processBtn.addEventListener("click", () => {
          void (async () => {
            if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected || doc.location.href !== parsed.href) return;
            const current = collectProcessPack(doc, parsed);
            if (!packText || !current || formatProcessPackPlain(current) !== packText) { announce(doc, "Process context changed. Reopen Page Info before copying."); return; }
            await copyText(doc, packText, "Process pack copied");
          })().catch(() => { if (dialog.isConnected) announce(doc, "Unable to copy the process pack"); });
        });
      }

      dialog.querySelector("#mpu-pi-compare-pack")?.addEventListener("click", async () => {
        const diffEl = dialog.querySelector("#mpu-pi-diff") as HTMLElement;
        try {
          const clip = await navigator.clipboard.readText();
          if (!clip.trim()) {
            announce(doc, "Clipboard is empty — copy object pack from another env first");
            return;
          }
          const { lines, changedCount } = compareObjectPackToBuffer(objectPack, clip);
          const out = lines
            .map((l) => `${l.changed ? "≠" : "="} ${l.key}: ${l.other} → ${l.current}`)
            .join("\n");
          diffEl.hidden = false;
          diffEl.textContent = `Compare object pack (${changedCount} differ)\n${out}`;
          announce(
            doc,
            changedCount === 0
              ? "Object pack matches clipboard"
              : `${changedCount} object pack field(s) differ from clipboard`,
          );
        } catch {
          announce(doc, "Unable to read clipboard for object pack compare");
        }
      });

      dialog.querySelector("#mpu-pi-prepare-comparison")?.addEventListener("click", async () => {
        if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected) return;
        close();
        try { await showComparisonCaptureDialog(doc, parsed); }
        catch { announce(doc, "Snapshot preview could not be prepared. Reopen Page Info and retry."); }
      });
      dialog.querySelector("#mpu-pi-watch-save")?.addEventListener("click", async () => {
        if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected) return;
        if (!parsed.menu || !parsed.component) {
          announce(doc, "Open a component page to watch customization");
          return;
        }
        const notes =
          (dialog.querySelector("#mpu-pi-watch-notes") as HTMLInputElement | null)?.value.trim() ||
          "";
        const fingerprint = capturePageFingerprint(doc, parsed);
        const watch = createWatchFromFingerprint({
          fingerprint,
          notes,
          envLabel,
          scope: watchScope(parsed),
        });
        const settings = await loadSettings();
        settings.customizationWatches = upsertWatch(settings.customizationWatches, watch);
        await saveSettings(settings);
        await refreshBaselines(watch.id);
        announce(
          doc,
          `Watching ${watch.menu}.${watch.component}.${watch.market} — baseline saved`,
        );
      });

      dialog.querySelector("#mpu-pi-check-drift")?.addEventListener("click", async () => {
        if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected) return;
        const diffEl = dialog.querySelector("#mpu-pi-diff") as HTMLElement;
        const settings = await loadSettings();
        const watch = listWatchesForParsed(settings.customizationWatches, parsed).find((entry) => entry.id === baselineSelect.value);
        if (!watch) {
          announce(
            doc,
            "Choose a saved baseline for this component, or capture one first",
          );
          return;
        }
        const current = capturePageFingerprint(doc, parsed);
        const report = compareFingerprints(watch.baseline, current);
        const out = formatDriftHandoffMarkdown(watch, report, envLabel);
        handoff = out;
        (dialog.querySelector("#mpu-pi-copy-handoff") as HTMLElement).hidden = false;
        diffEl.hidden = false;
        diffEl.textContent = out;
        const severityMsg =
          report.severity === "clean"
            ? "No differences in the captured UI fingerprint"
            : report.severity === "tools-only"
              ? "Tools release changed only — review findings"
              : "Review capture warnings or UI differences";
        announce(doc, `Upgrade watch: ${severityMsg} (${report.severity})`);
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

  const close = bindModalDialog(doc, backdrop, dialog);
  dialog.querySelector("#mpu-goto-close")?.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });


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
  const url = getExtensionApi().runtime.getURL("inject/clear-bcs.js");
  const s = doc.createElement("script");
  s.src = url;
  s.onload = () => s.remove();
  (doc.head || doc.documentElement).appendChild(s);
}

function injectResizeFrame(doc: Document, after?: () => void): void {
  const url = getExtensionApi().runtime.getURL("inject/resize-frame.js");
  const s = doc.createElement("script");
  s.src = url;
  s.onload = () => {
    s.remove();
    // Let PeopleSoft finish applying top/height before we reserve bar space
    viewRaf(doc, () => after?.());
  };
  s.onerror = () => {
    s.remove();
    after?.();
  };
  (doc.head || doc.documentElement).appendChild(s);
}
