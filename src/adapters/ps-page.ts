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

export function extractPageMeta(doc: Document = document): PageMeta {
  const meta: PageMeta = {};
  const html = doc.documentElement?.innerHTML ?? "";
  const comment = html.match(
    /<!--\s*User=([^;]*);.*?ToolsRel=([^;]*);.*?AppServ=([^>]*)-->/i,
  );
  if (comment) {
    meta.userId = comment[1]?.trim();
    meta.toolsRel = comment[2]?.trim();
    meta.appServer = comment[3]?.trim();
  }

  const info = doc.querySelector("#pt_pageinfo");
  if (info) {
    meta.menu = info.getAttribute("menu") ?? info.getAttribute("data-menu") ?? undefined;
    meta.component =
      info.getAttribute("component") ?? info.getAttribute("data-component") ?? undefined;
    meta.page = info.getAttribute("page") ?? info.getAttribute("data-page") ?? undefined;
  }

  return meta;
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

export function getTargetDocument(doc: Document = document): Document {
  const frame = doc.querySelector(
    "#ptifrmtgtframe",
  ) as HTMLIFrameElement | null;
  if (frame?.contentDocument) return frame.contentDocument;

  const nav = doc.querySelector(".ps_target-iframe") as HTMLIFrameElement | null;
  if (nav?.contentDocument) return nav.contentDocument;

  return doc;
}
