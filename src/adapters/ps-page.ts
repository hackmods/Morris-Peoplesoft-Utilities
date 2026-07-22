export type PageKind =
  | "component"
  | "homepage"
  | "homepageNav"
  | "worklist"
  | "login"
  | "logout"
  | "unknown";

export type UiModel = "classic" | "fluid" | "navCollection" | "unknown";

export interface ParsedPsUrl {
  href: string;
  baseURL: string;
  origin: string;
  servlet: "psp" | "psc" | null;
  site: string;
  siteNormalized: string;
  portal: string;
  node: string;
  kind: PageKind;
  menu?: string;
  component?: string;
  market?: string;
}

/** Build a Classic/Fluid component navigation URL (UX-02). */
export function buildComponentUrl(parts: {
  baseURL: string;
  servlet: "psp" | "psc";
  site: string;
  portal: string;
  node: string;
  menu: string;
  component: string;
  market?: string;
  parameters?: string;
  newWin?: boolean;
}): string | null {
  const baseURL = parts.baseURL.replace(/\/$/, "");
  const menu = parts.menu.trim();
  const component = parts.component.trim();
  const portal = parts.portal.trim();
  const node = parts.node.trim();
  const siteRaw = parts.site.trim();
  if (!baseURL || !menu || !component || !portal || !node || !siteRaw) return null;
  const site = parts.newWin
    ? siteRaw.endsWith("_newwin")
      ? siteRaw
      : `${normalizeSite(siteRaw)}_newwin`
    : siteRaw;
  const market = (parts.market || "GBL").trim() || "GBL";
  const parameters = parts.parameters || "";
  return `${baseURL}/${parts.servlet}/${site}/${portal}/${node}/c/${menu}.${component}.${market}${parameters}`;
}

const COMPONENT_RE =
  /^(https?:\/\/[^/]+)\/(psp|psc)\/([^/]+)\/([^/]+)\/([^/]+)\/c\/([^.]+)\.([^.]+)\.([^/?#]+)/i;
const HOME_RE =
  /^(https?:\/\/[^/]+)\/(psp|psc)\/([^/]+)\/([^/]+)\/([^/]+)\/h\//i;
const SEARCH_RE =
  /^(https?:\/\/[^/]+)\/(psp|psc)\/([^/]+)\/([^/]+)\/([^/]+)\/s\//i;
const WORKLIST_RE =
  /^(https?:\/\/[^/]+)\/(psp|psc)\/([^/]+)\/([^/]+)\/([^/]+)\/w\/WORKLIST/i;
const LOGIN_RE = /[?&]cmd=(login|logout)/i;

function normalizeSite(site: string): string {
  return site.replace(/_\d+/gi, "");
}

export function parsePsUrl(href: string): ParsedPsUrl {
  const unknown: ParsedPsUrl = {
    href,
    baseURL: "",
    origin: "",
    servlet: null,
    site: "",
    siteNormalized: "",
    portal: "",
    node: "",
    kind: "unknown",
  };

  let origin: string;
  try {
    origin = new URL(href).origin;
  } catch {
    return unknown;
  }

  if (LOGIN_RE.test(href)) {
    const m = href.match(/^(https?:\/\/[^/]+)\/(psp|psc)\/([^/?#]+)/i);
    const cmd = /cmd=logout/i.test(href) ? "logout" : "login";
    return {
      href,
      baseURL: m?.[1] ?? origin,
      origin,
      servlet: (m?.[2]?.toLowerCase() as "psp" | "psc") ?? null,
      site: m?.[3] ?? "",
      siteNormalized: normalizeSite(m?.[3] ?? ""),
      portal: "",
      node: "",
      kind: cmd,
    };
  }

  let m = href.match(COMPONENT_RE);
  if (m) {
    return {
      href,
      baseURL: m[1],
      origin,
      servlet: m[2].toLowerCase() as "psp" | "psc",
      site: m[3],
      siteNormalized: normalizeSite(m[3]),
      portal: m[4],
      node: m[5],
      kind: "component",
      menu: m[6],
      component: m[7],
      market: m[8],
    };
  }

  m = href.match(HOME_RE);
  if (m) {
    return {
      href,
      baseURL: m[1],
      origin,
      servlet: m[2].toLowerCase() as "psp" | "psc",
      site: m[3],
      siteNormalized: normalizeSite(m[3]),
      portal: m[4],
      node: m[5],
      kind: "homepage",
    };
  }

  m = href.match(SEARCH_RE);
  if (m) {
    return {
      href,
      baseURL: m[1],
      origin,
      servlet: m[2].toLowerCase() as "psp" | "psc",
      site: m[3],
      siteNormalized: normalizeSite(m[3]),
      portal: m[4],
      node: m[5],
      kind: "homepageNav",
    };
  }

  m = href.match(WORKLIST_RE);
  if (m) {
    return {
      href,
      baseURL: m[1],
      origin,
      servlet: m[2].toLowerCase() as "psp" | "psc",
      site: m[3],
      siteNormalized: normalizeSite(m[3]),
      portal: m[4],
      node: m[5],
      kind: "worklist",
    };
  }

  return { ...unknown, origin, baseURL: origin };
}

export function detectUiModel(doc: Document = document): UiModel {
  if (doc.querySelector(".ps_target-iframe")) return "navCollection";
  if (
    doc.querySelector("#PT_HEADER, #pthdr2container, #ptbr_header_container, .ps_box-control")
  ) {
    return "fluid";
  }
  if (doc.querySelector("#ptifrmtgtframe, #pt_pageinfo, .pslogineditbox")) {
    return "classic";
  }
  return "unknown";
}

export interface PageMeta {
  userId?: string;
  toolsRel?: string;
  appServer?: string;
  dbName?: string;
  dbType?: string;
  appsRel?: string;
  menu?: string;
  component?: string;
  page?: string;
  /** classic | fluid | navCollection | unknown */
  uiMode?: string;
  /**
   * True when an ICSID (or equivalent page state token input) is present.
   * Boolean only — never store or display the token value (TR-03).
   */
  pageTokenPresent?: boolean;
}

/** FL-02: portal / CREF path when Fluid nav or breadcrumbs expose it. */
export function detectFluidCrefPath(doc: Document = document): string | undefined {
  const target = getTargetDocument(doc);
  const crumbs: string[] = [];

  const selectors = [
    ".ps_breadcrumb a",
    ".ps_breadcrumb span",
    "#PT_BREAD_CRUMB a",
    "#PT_BREAD_CRUMB span",
    "[class*='breadcrumb'] a",
    "nav[aria-label*='breadcrumb' i] a",
    ".ps_header-crumb a",
  ];
  for (const sel of selectors) {
    for (const el of Array.from(target.querySelectorAll(sel))) {
      const t = el.textContent?.replace(/\s+/g, " ").trim();
      if (t && t.length > 1 && t !== "/") crumbs.push(t);
    }
    if (crumbs.length) break;
  }

  const crefEl =
    target.querySelector('[data-cref], [data-content-ref], [id*="CREF" i][title]') ||
    target.querySelector('[class*="cref" i][title]');
  const crefTitle = crefEl?.getAttribute("title") || crefEl?.getAttribute("data-cref");
  if (crefTitle?.trim()) crumbs.push(crefTitle.trim());

  const portalPath = target.querySelector('[id*="PORTAL_PATH" i], [data-portal-path]');
  const portalVal =
    portalPath?.getAttribute("data-portal-path") ||
    portalPath?.textContent?.replace(/\s+/g, " ").trim();
  if (portalVal && portalVal.length > 2) crumbs.push(portalVal);

  if (!crumbs.length) return undefined;
  return [...new Set(crumbs)].join(" > ").slice(0, 240);
}

/** FL-03: Fluid theme / branding id from DOM markers (metadata only). */
export function detectFluidTheme(doc: Document = document): string | undefined {
  const target = getTargetDocument(doc);
  const root = target.documentElement;
  const body = target.body;

  const classTokens = `${root?.className || ""} ${body?.className || ""}`.split(/\s+/);
  const themeClass = classTokens.find((c) => /^ptal-theme/i.test(c) || /^ps_theme/i.test(c));
  if (themeClass) return themeClass;

  const branding =
    target.querySelector(".ps_branding, [class*='branding'], [id*='branding' i], #PT_BRAND") ||
    doc.querySelector(".ps_branding, [class*='branding'], #PT_BRAND");
  if (branding) {
    const id = branding.id || branding.getAttribute("data-theme") || branding.getAttribute("data-brand");
    if (id?.trim()) return id.trim().slice(0, 80);
    const cls = typeof branding.className === "string" ? branding.className.split(/\s+/).find(Boolean) : "";
    if (cls) return cls.slice(0, 80);
  }

  for (const link of Array.from(target.querySelectorAll('link[rel="stylesheet"]'))) {
    const href = link.getAttribute("href") || "";
    const m = href.match(/(?:theme|branding|ptal)[/_-]([a-z0-9_-]+)/i);
    if (m?.[1]) return `stylesheet:${m[1]}`.slice(0, 80);
  }

  return undefined;
}

/** Pull connection keys from a PeopleSoft HTML comment (parity with PS Utilities). */
export function parseConnectionComment(text: string): Partial<PageMeta> {
  const cleaned = text.replace(/^<!--/, "").replace(/-->$/, "").trim();
  if (
    !/ToolsRel\s*=/i.test(cleaned) &&
    !/User\s*=/i.test(cleaned) &&
    !/AppServ\s*=/i.test(cleaned) &&
    !/DBName\s*=/i.test(cleaned) &&
    !/DBType\s*=/i.test(cleaned) &&
    !/Apps?Rel\s*=/i.test(cleaned)
  ) {
    return {};
  }

  const meta: Partial<PageMeta> = {};
  // Support both `Key=value;Key2=value2` and newline-separated forms
  const pieces = cleaned.split(/[;\n\r]+/);
  for (const raw of pieces) {
    const piece = raw.replace(/\s+/g, "");
    if (!piece) continue;
    if (/^User=/i.test(piece)) {
      meta.userId = piece.replace(/^User=/i, "") || undefined;
    } else if (/^ToolsRel=/i.test(piece)) {
      meta.toolsRel = piece.replace(/^ToolsRel=/i, "") || undefined;
    } else if (/^AppServ=/i.test(piece)) {
      meta.appServer = piece.replace(/^AppServ=/i, "") || undefined;
    } else if (/^DBName=/i.test(piece)) {
      meta.dbName = piece.replace(/^DBName=/i, "") || undefined;
    } else if (/^DBType=/i.test(piece)) {
      meta.dbType = piece.replace(/^DBType=/i, "") || undefined;
    } else if (/^AppsRel=/i.test(piece) || /^AppRel=/i.test(piece)) {
      meta.appsRel = piece.replace(/^Apps?Rel=/i, "") || undefined;
    }
  }

  // Fallback when delimiters were stripped/missing
  if (!meta.toolsRel) {
    const m = cleaned.match(/ToolsRel\s*=\s*([^\s;<>]+)/i);
    if (m) meta.toolsRel = m[1];
  }
  if (!meta.userId) {
    const m = cleaned.match(/User\s*=\s*([^\s;<>]+)/i);
    if (m) meta.userId = m[1];
  }
  if (!meta.appServer) {
    const m = cleaned.match(/AppServ\s*=\s*([^\s;<>]+)/i);
    if (m) meta.appServer = m[1];
  }
  if (!meta.dbName) {
    const m = cleaned.match(/DBName\s*=\s*([^\s;<>]+)/i);
    if (m) meta.dbName = m[1];
  }
  if (!meta.dbType) {
    const m = cleaned.match(/DBType\s*=\s*([^\s;<>]+)/i);
    if (m) meta.dbType = m[1];
  }
  if (!meta.appsRel) {
    const m = cleaned.match(/Apps?Rel\s*=\s*([^\s;<>]+)/i);
    if (m) meta.appsRel = m[1];
  }

  return meta;
}

function commentNodes(doc: Document): string[] {
  const out: string[] = [];
  const visit = (root: Node | null | undefined) => {
    if (!root) return;
    for (const node of Array.from(root.childNodes)) {
      if (node.nodeType === Node.COMMENT_NODE) {
        const text = node.textContent ?? "";
        if (/User\s*=|ToolsRel\s*=|AppServ\s*=|DBName\s*=|DBType\s*=|Apps?Rel\s*=/i.test(text)) {
          out.push(text);
        }
      }
    }
  };
  // Comments may sit as direct children of the Document (before <html>)
  visit(doc);
  visit(doc.documentElement);
  visit(doc.head);
  visit(doc.body);
  return out;
}

function mergePageMeta(into: PageMeta, from: PageMeta): PageMeta {
  return {
    userId: into.userId || from.userId,
    toolsRel: into.toolsRel || from.toolsRel,
    appServer: into.appServer || from.appServer,
    dbName: into.dbName || from.dbName,
    dbType: into.dbType || from.dbType,
    appsRel: into.appsRel || from.appsRel,
    menu: into.menu || from.menu,
    component: into.component || from.component,
    page: into.page || from.page,
    uiMode: into.uiMode || from.uiMode,
    pageTokenPresent: Boolean(into.pageTokenPresent || from.pageTokenPresent),
  };
}

/** Detect presence of page state token without reading/copying its value. */
export function detectPageTokenPresent(doc: Document): boolean {
  const el =
    doc.getElementById("ICSID") ||
    doc.querySelector<HTMLInputElement>('input[name="ICSID"], input#ICSID');
  if (!el) return false;
  const value = (el as HTMLInputElement).value;
  return typeof value === "string" ? value.length > 0 : true;
}

export function extractPageMeta(doc: Document = document): PageMeta {
  let meta: PageMeta = {};

  for (const text of commentNodes(doc)) {
    meta = mergePageMeta(meta, parseConnectionComment(text));
  }

  // Also scan serialized HTML for comments (covers odd DOM placements)
  if (!meta.toolsRel || !meta.userId || !meta.appServer || !meta.dbName) {
    const html = `${doc.documentElement?.outerHTML ?? ""}\n${doc.documentElement?.innerHTML ?? ""}`;
    const re = /<!--([\s\S]*?)-->/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const parsed = parseConnectionComment(m[1] ?? "");
      if (
        parsed.toolsRel ||
        parsed.userId ||
        parsed.appServer ||
        parsed.dbName ||
        parsed.dbType ||
        parsed.appsRel
      ) {
        meta = mergePageMeta(meta, parsed);
      }
    }
  }

  const info = doc.querySelector("#pt_pageinfo");
  if (info) {
    meta.menu =
      meta.menu ||
      info.getAttribute("menu") ||
      info.getAttribute("data-menu") ||
      undefined;
    meta.component =
      meta.component ||
      info.getAttribute("component") ||
      info.getAttribute("data-component") ||
      undefined;
    meta.page =
      meta.page ||
      info.getAttribute("page") ||
      info.getAttribute("data-page") ||
      undefined;
  }

  if (!meta.uiMode) {
    meta.uiMode = detectUiModel(doc);
  }

  meta.pageTokenPresent = detectPageTokenPresent(doc);
  return meta;
}

/** Merge portal chrome + Classic TargetContent / Fluid page meta (ToolsRel often lives in one of them). */
export function collectPageMeta(portalDoc: Document = document): PageMeta {
  const target = getTargetDocument(portalDoc);
  const portalMeta = extractPageMeta(portalDoc);
  if (target === portalDoc) return portalMeta;
  const merged = mergePageMeta(portalMeta, extractPageMeta(target));
  // Prefer portal chrome for UI mode when Classic iframe is present
  if (portalDoc.querySelector("#ptifrmtgtframe, #ptifrmtarget")) {
    merged.uiMode = "classic";
  } else if (!merged.uiMode) {
    merged.uiMode = detectUiModel(portalDoc);
  }
  return merged;
}

/** Plain-text Page Info block for dialog / clipboard. */
export function formatPageInfoPlain(
  meta: PageMeta,
  parsed: ParsedPsUrl,
  lockedField?: string | null,
): string {
  const mode =
    meta.uiMode === "navCollection"
      ? "Nav collection"
      : meta.uiMode === "classic"
        ? "Classic"
        : meta.uiMode === "fluid"
          ? "Fluid"
          : meta.uiMode || "—";
  const lines = [
    `Menu: ${meta.menu ?? parsed.menu ?? "—"}`,
    `Component: ${meta.component ?? parsed.component ?? "—"}`,
    `Page: ${meta.page ?? "—"}`,
    `Market: ${parsed.market ?? "—"}`,
    `Site: ${parsed.site || parsed.siteNormalized || "—"}`,
    `Portal: ${parsed.portal || "—"}`,
    `Node: ${parsed.node || "—"}`,
    `Mode: ${mode}`,
    `User: ${meta.userId ?? "—"}`,
    `ToolsRel: ${meta.toolsRel ?? "—"}`,
    `AppsRel: ${meta.appsRel ?? "—"}`,
    `DB Name: ${meta.dbName ?? "—"}`,
    `DB Type: ${meta.dbType ?? "—"}`,
    `App Server: ${meta.appServer ?? "—"}`,
    `Page token: ${meta.pageTokenPresent ? "present" : "not detected"}`,
  ];
  if (lockedField) lines.push(`Locked field: ${lockedField}`);
  const crefPath = detectFluidCrefPath();
  if (crefPath) lines.push(`CREF path: ${crefPath}`);
  const theme = detectFluidTheme();
  if (theme) lines.push(`Theme: ${theme}`);
  const tips = toolsRelTips(meta.toolsRel, meta.uiMode);
  if (tips.length) {
    lines.push("", "Tips:");
    for (const tip of tips) lines.push(`- ${tip}`);
  }
  return lines.join("\n");
}

/** Markdown snippet for tickets / Jira (PI-02). */
export function formatPageInfoMarkdown(
  meta: PageMeta,
  parsed: ParsedPsUrl,
  lockedField?: string | null,
): string {
  const mode =
    meta.uiMode === "navCollection"
      ? "Nav collection"
      : meta.uiMode === "classic"
        ? "Classic"
        : meta.uiMode === "fluid"
          ? "Fluid"
          : meta.uiMode || "—";
  const rows: Array<[string, string]> = [
    ["Menu", meta.menu ?? parsed.menu ?? "—"],
    ["Component", meta.component ?? parsed.component ?? "—"],
    ["Page", meta.page ?? "—"],
    ["Market", parsed.market ?? "—"],
    ["Site", parsed.site || parsed.siteNormalized || "—"],
    ["Portal", parsed.portal || "—"],
    ["Node", parsed.node || "—"],
    ["Mode", mode],
    ["User", meta.userId ?? "—"],
    ["ToolsRel", meta.toolsRel ?? "—"],
    ["AppsRel", meta.appsRel ?? "—"],
    ["DB Name", meta.dbName ?? "—"],
    ["DB Type", meta.dbType ?? "—"],
    ["App Server", meta.appServer ?? "—"],
    ["Page token", meta.pageTokenPresent ? "present" : "not detected"],
  ];
  if (lockedField) rows.push(["Locked field", lockedField]);
  const crefPath = detectFluidCrefPath();
  if (crefPath) rows.push(["CREF path", crefPath]);
  const theme = detectFluidTheme();
  if (theme) rows.push(["Theme", theme]);
  const body = rows.map(([k, v]) => `| ${k} | ${v} |`).join("\n");
  const tips = toolsRelTips(meta.toolsRel, meta.uiMode);
  const tipBlock = tips.length ? `\n\n**Tips**\n\n${tips.map((t) => `- ${t}`).join("\n")}\n` : "\n";
  return `### PeopleSoft page info\n\n| | |\n|---|---|\n${body}${tipBlock}`;
}

/** Context tips from ToolsRel / UI mode (SP-04). */
export function toolsRelTips(toolsRel?: string, uiMode?: string): string[] {
  const tips: string[] = [];
  const rel = (toolsRel || "").trim();
  const major = Number.parseFloat(rel);
  if (uiMode === "classic") {
    if (!Number.isNaN(major) && major >= 8.6) {
      tips.push(
        "Classic 8.6+: Field Inspector targets #ptifrmtgtframe — wait for TargetContent to finish loading before Inspect.",
      );
    }
  }
  if (uiMode === "fluid") {
    tips.push("Fluid: Inspect wraps ps_box-edit/control hosts; use Recents or Go to for component jumps.");
  }
  if (uiMode === "navCollection") {
    tips.push("Nav collection: Inspect walks nested .ps_target-iframe documents when same-origin.");
  }
  if (!rel) {
    tips.push("ToolsRel not detected yet — open a component page or wait for the content frame, then reopen Page Info.");
  } else if (!Number.isNaN(major) && major < 8.55) {
    tips.push(`ToolsRel ${rel}: older layouts may use different search/Correct History control ids.`);
  } else if (rel) {
    tips.push(`ToolsRel ${rel}: Trace uses delivered UTILITIES components; 🔒 means security is missing.`);
  }
  return tips;
}

const PAGE_INFO_COMPARE_KEYS = [
  "Menu",
  "Component",
  "Page",
  "Market",
  "Site",
  "Portal",
  "Node",
  "Mode",
  "ToolsRel",
  "AppsRel",
  "DB Name",
  "DB Type",
] as const;

function parsePageInfoLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:\|\s*)?([^|:]+)\s*[|:]\s*(.+?)\s*(?:\|)?\s*$/);
    if (!m) continue;
    const key = m[1]!.trim();
    const val = m[2]!.trim();
    if (key && key !== "—" && key !== "") out[key] = val;
  }
  return out;
}

export interface KeyValueDiffLine {
  key: string;
  current: string;
  other: string;
  changed: boolean;
}

/** Generic key:value diff for Page Info, object pack, etc. (AD-04). */
export function compareKeyValueBuffer(
  currentPlain: string,
  buffer: string,
  keys: readonly string[],
): { lines: KeyValueDiffLine[]; changedCount: number } {
  const cur = parsePageInfoLines(currentPlain);
  const other = parsePageInfoLines(buffer);
  const lines: KeyValueDiffLine[] = keys.map((key) => {
    const current = cur[key] ?? "—";
    const o = other[key] ?? "—";
    return { key, current, other: o, changed: current !== o };
  });
  return { lines, changedCount: lines.filter((l) => l.changed).length };
}

/** Compare current Page Info to a clipboard / buffer string (UX-07). */
export function comparePageInfoToBuffer(
  currentPlain: string,
  buffer: string,
): { lines: KeyValueDiffLine[]; changedCount: number } {
  return compareKeyValueBuffer(currentPlain, buffer, PAGE_INFO_COMPARE_KEYS);
}

export type PageInfoDiffLine = KeyValueDiffLine;

/** Favorite description template from Page Info + locked field (UX-10). */
export function formatFavoriteDescriptionTemplate(
  meta: PageMeta,
  parsed: ParsedPsUrl,
  lockedField?: string | null,
): string {
  const parts = [
    `${meta.menu ?? parsed.menu ?? "?"}.${meta.component ?? parsed.component ?? "?"}.${parsed.market || "GBL"}`,
  ];
  if (meta.page) parts.push(`Page ${meta.page}`);
  if (meta.toolsRel) parts.push(`ToolsRel ${meta.toolsRel}`);
  if (meta.dbName) parts.push(`DB ${meta.dbName}`);
  if (lockedField) parts.push(`Field ${lockedField}`);
  return parts.join(" · ");
}

export function findHeaderMount(
  doc: Document = document,
  opts?: { loginMode?: boolean },
): Element | null {
  // Classic portal: bar sits immediately above the content iframe container
  if (doc.querySelector("#ptifrmtarget")) {
    return doc.querySelector("#ptifrmtarget");
  }

  if (opts?.loginMode) {
    // SP-08: place bar safely above the password form — never read input values
    const pwd = doc.querySelector('input[type="password"]');
    if (pwd) {
      const form =
        pwd.closest("form") ||
        pwd.closest(".ps_signinentry, .psloginframe, .ps_box-group, #login, .pslogin") ||
        pwd.parentElement;
      if (form?.parentElement) return form;
    }
  }

  return (
    doc.querySelector("#pthdr2container") ||
    doc.querySelector("#PT_HEADER") ||
    doc.querySelector("#ptbr_header_container") ||
    doc.querySelector(".ps_signinentry") ||
    doc.querySelector(".psloginframe") ||
    doc.body
  );
}

export interface PageTabLink {
  label: string;
  el: HTMLElement;
  /** True when this tab matches the active page name / selected tab control. */
  current: boolean;
}

function isActiveTabControl(el: HTMLElement): boolean {
  const role = el.getAttribute("role");
  if (role === "tab" && el.getAttribute("aria-selected") === "true") return true;
  if (el.classList.contains("PSACTIVETAB") || el.classList.contains("ps_box-tab-selected")) {
    return true;
  }
  const parent = el.closest(
    "li, .ps_box-tab, .PSTAB, .ps_tabs_item, [role='presentation']",
  );
  if (
    parent &&
    (parent.classList.contains("PSACTIVETAB") ||
      parent.classList.contains("ps_box-tab-selected") ||
      parent.getAttribute("aria-selected") === "true" ||
      parent.classList.contains("ui-tabs-active"))
  ) {
    return true;
  }
  return false;
}

/** Discover delivered PeopleSoft page/tab links for Pages menu (SP-01 / legacy parity). */
export function collectPageTabs(doc: Document = document): PageTabLink[] {
  const target = getTargetDocument(doc);
  const meta = collectPageMeta(doc);
  const currentPage = (meta.page || "").replace(/\s+/g, " ").trim().toLowerCase();
  const out: PageTabLink[] = [];
  const seen = new Set<string>();
  const selectors = [
    "[id$='divPSPANELTABLINKS'] a",
    "#pstabs a",
    ".PSLEVEL1NAV a",
    ".PSLEVEL2NAVORIZONTAL a",
    ".ps_box-tab a",
    ".ps_tabs a",
    '[role="tab"]',
    "#pttablist a",
  ];
  for (const sel of selectors) {
    for (const node of Array.from(target.querySelectorAll(sel))) {
      if (!(node instanceof HTMLElement)) continue;
      const label = (node.textContent || node.getAttribute("title") || "").replace(/\s+/g, " ").trim();
      if (!label || label.length > 80) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const current =
        isActiveTabControl(node) ||
        (currentPage !== "" &&
          (key === currentPage || key.includes(currentPage) || currentPage.includes(key)));
      out.push({ label, el: node, current });
      if (out.length >= 40) return out;
    }
  }
  return out;
}

type NamedFrameWindow = Window & { TargetContent?: Window };

function docFromFrameWindow(frameWin: Window | null | undefined): Document | null {
  if (!frameWin) return null;
  try {
    const d = frameWin.document;
    return d?.body ? d : null;
  } catch {
    return null;
  }
}

/** True when the document already exposes PeopleSoft-style field ids. */
export function documentHasPsFields(d: Document): boolean {
  try {
    return Boolean(
      d.querySelector(
        'input[id*="_"],select[id*="_"],textarea[id*="_"],span.PSEDITBOX_DISPONLY[id],span.ps_box-value[id]',
      ),
    );
  } catch {
    return false;
  }
}

/**
 * Portal / Fluid content iframe element (Classic TargetContent, Fluid nav collection,
 * or Classic page hosted inside a Fluid shell).
 */
export function findContentFrameElement(doc: Document): HTMLIFrameElement | null {
  return (
    (doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
    (doc.querySelector('iframe[name="TargetContent"], frame[name="TargetContent"]') as
      | HTMLIFrameElement
      | null) ||
    (doc.querySelector(".ps_target-iframe") as HTMLIFrameElement | null)
  );
}

/**
 * Prefer deepest same-origin nav-collection / content iframe (UX-08),
 * but never abandon a Classic page that already has PeopleSoft fields for an
 * empty nested iframe (e.g. unrelated .ps_target-iframe / lookup shells).
 */
export function resolveNestedContentDocument(contentDoc: Document): Document {
  let current = contentDoc;
  for (let depth = 0; depth < 4; depth += 1) {
    const nested =
      (current.querySelector(".ps_target-iframe") as HTMLIFrameElement | null) ||
      (current.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
      (current.querySelector('iframe[name="TargetContent"]') as HTMLIFrameElement | null);
    if (!nested?.contentDocument?.body) break;
    const next = nested.contentDocument;
    if (documentHasPsFields(next)) {
      current = next;
      continue;
    }
    if (!documentHasPsFields(current)) {
      current = next;
      continue;
    }
    break;
  }
  return current;
}

/**
 * Outermost same-origin content frame document for Field Inspector (and similar).
 * Fluid menus / Activity Guides often wrap Classic pages in nested iframes — start
 * here and walk all nested docs so Classic fields inside Fluid shells are decorated.
 */
export function getInspectorContentRoot(doc: Document = document): Document {
  const frameEl = findContentFrameElement(doc);
  if (frameEl?.contentDocument?.body) return frameEl.contentDocument;

  const win = doc.defaultView as NamedFrameWindow | null;
  try {
    const tcDoc = docFromFrameWindow(win?.TargetContent ?? null);
    if (tcDoc && tcDoc !== doc) return tcDoc;
  } catch {
    /* cross-origin */
  }

  return doc;
}

export function getTargetDocument(doc: Document = document): Document {
  const win = doc.defaultView as NamedFrameWindow | null;

  // Prefer Classic iframe elements first — named window.TargetContent is unreliable
  // in some hosts/test environments (can resolve to the parent window itself).
  const frameEl =
    (doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
    (doc.querySelector('iframe[name="TargetContent"], frame[name="TargetContent"]') as
      | HTMLIFrameElement
      | null);
  if (frameEl?.contentDocument?.body) {
    return resolveNestedContentDocument(frameEl.contentDocument);
  }

  // Classic portal: named TargetContent frame (PS Utilities uses parent.TargetContent)
  try {
    const tcDoc = docFromFrameWindow(win?.TargetContent ?? null);
    if (tcDoc && tcDoc !== doc) return resolveNestedContentDocument(tcDoc);
  } catch {
    /* cross-origin or unavailable */
  }

  try {
    const frames = win?.frames as unknown as
      | { namedItem?: (name: string) => Window | null; TargetContent?: Window }
      | undefined;
    const byName =
      frames?.namedItem?.("TargetContent") ??
      frames?.TargetContent ??
      null;
    const tcDoc = docFromFrameWindow(byName);
    if (tcDoc && tcDoc !== doc) return resolveNestedContentDocument(tcDoc);
  } catch {
    /* ignore */
  }

  // Fluid / nav collection: Classic pages often live inside .ps_target-iframe chains
  const nav = doc.querySelector(".ps_target-iframe") as HTMLIFrameElement | null;
  if (nav?.contentDocument?.body) {
    return resolveNestedContentDocument(nav.contentDocument);
  }

  return doc;
}
