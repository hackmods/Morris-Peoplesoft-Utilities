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
  menu?: string;
  component?: string;
  page?: string;
}

/** Pull connection keys from a PeopleSoft HTML comment (parity with PS Utilities). */
export function parseConnectionComment(text: string): Partial<PageMeta> {
  const cleaned = text.replace(/^<!--/, "").replace(/-->$/, "").trim();
  if (!/ToolsRel\s*=/i.test(cleaned) && !/User\s*=/i.test(cleaned) && !/AppServ\s*=/i.test(cleaned)) {
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
    }
  }

  // Fallback when delimiters were stripped/missing (e.g. "User=XToolsRel=8.61")
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

  return meta;
}

function commentNodes(doc: Document): string[] {
  const out: string[] = [];
  const visit = (root: Node | null | undefined) => {
    if (!root) return;
    for (const node of Array.from(root.childNodes)) {
      if (node.nodeType === Node.COMMENT_NODE) {
        const text = node.textContent ?? "";
        if (/User\s*=|ToolsRel\s*=|AppServ\s*=/i.test(text)) {
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
    menu: into.menu || from.menu,
    component: into.component || from.component,
    page: into.page || from.page,
  };
}

export function extractPageMeta(doc: Document = document): PageMeta {
  let meta: PageMeta = {};

  for (const text of commentNodes(doc)) {
    meta = mergePageMeta(meta, parseConnectionComment(text));
  }

  // Also scan serialized HTML for comments (covers odd DOM placements)
  if (!meta.toolsRel || !meta.userId || !meta.appServer) {
    const html = `${doc.documentElement?.outerHTML ?? ""}\n${doc.documentElement?.innerHTML ?? ""}`;
    const re = /<!--([\s\S]*?)-->/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const parsed = parseConnectionComment(m[1] ?? "");
      if (parsed.toolsRel || parsed.userId || parsed.appServer) {
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

  return meta;
}

/** Merge portal chrome + Classic TargetContent / Fluid page meta (ToolsRel often lives in one of them). */
export function collectPageMeta(portalDoc: Document = document): PageMeta {
  const target = getTargetDocument(portalDoc);
  if (target === portalDoc) return extractPageMeta(portalDoc);
  return mergePageMeta(extractPageMeta(portalDoc), extractPageMeta(target));
}

export function findHeaderMount(doc: Document = document): Element | null {
  // Classic portal: bar sits immediately above the content iframe container
  if (doc.querySelector("#ptifrmtarget")) {
    return doc.querySelector("#ptifrmtarget");
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

export function getTargetDocument(doc: Document = document): Document {
  const win = doc.defaultView as NamedFrameWindow | null;

  const resolveNested = (contentDoc: Document): Document => {
    const nested = contentDoc.querySelector(".ps_target-iframe") as HTMLIFrameElement | null;
    if (nested?.contentDocument?.body) return nested.contentDocument;
    return contentDoc;
  };

  // Prefer Classic iframe elements first — named window.TargetContent is unreliable
  // in some hosts/test environments (can resolve to the parent window itself).
  const frameEl =
    (doc.querySelector("#ptifrmtgtframe") as HTMLIFrameElement | null) ||
    (doc.querySelector('iframe[name="TargetContent"], frame[name="TargetContent"]') as
      | HTMLIFrameElement
      | null);
  if (frameEl?.contentDocument?.body) {
    return resolveNested(frameEl.contentDocument);
  }

  // Classic portal: named TargetContent frame (PS Utilities uses parent.TargetContent)
  try {
    const tcDoc = docFromFrameWindow(win?.TargetContent ?? null);
    if (tcDoc && tcDoc !== doc) return resolveNested(tcDoc);
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
    if (tcDoc && tcDoc !== doc) return resolveNested(tcDoc);
  } catch {
    /* ignore */
  }

  const nav = doc.querySelector(".ps_target-iframe") as HTMLIFrameElement | null;
  if (nav?.contentDocument?.body) return nav.contentDocument;

  return doc;
}
