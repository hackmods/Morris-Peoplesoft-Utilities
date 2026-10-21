import { getExtensionApi } from "../platform/browser";
/**
 * Toggle PeopleCode + SQL session trace using delivered UTILITIES components.
 * Classic PeopleSoft protocol (parity with PS Utilities):
 * 1) GET psc/{site}_newwin/.../UTILITIES.*.GBL
 * 2) Parse ICSID / ICStateNum / ICElementNum + auth checkbox presence
 * 3) POST #ICSave with elId=Y/N and elId$chk=Y/N
 */
import type { MpuSettings, TraceSettings, YesNo } from "../storage/schema";
import type { ParsedPsUrl } from "../adapters/ps-page";
import { originAllowed, updateSettings } from "../storage/settings";
import { announce } from "./bar";
import { isYes } from "../storage/schema";
import { currentPageAccess } from "./access";
import { authorizeWriteAction } from "./production-awareness";

type TraceOpt = { key: keyof TraceSettings; elId: string };

const PC_OPTS: TraceOpt[] = [
  { key: "PC0001", elId: "DEBUG_PEOPLECD_DEBUG_TRACE_ALL" },
  { key: "PC0002", elId: "DEBUG_PEOPLECD_DEBUG_LIST" },
  { key: "PC0004", elId: "DEBUG_PEOPLECD_DEBUG_SHOW_ASSIGN" },
  { key: "PC0008", elId: "DEBUG_PEOPLECD_DEBUG_SHOW_FETCH" },
  { key: "PC0016", elId: "DEBUG_PEOPLECD_DEBUG_SHOW_STACK" },
  { key: "PC0064", elId: "DEBUG_PEOPLECD_DEBUG_TRACE_START" },
  { key: "PC0128", elId: "DEBUG_PEOPLECD_DEBUG_TRACE_EXT" },
  { key: "PC0256", elId: "DEBUG_PEOPLECD_DEBUG_TRACE_INT" },
  { key: "PC0512", elId: "DEBUG_PEOPLECD_DEBUG_SHOW_PARMS" },
  { key: "PC1024", elId: "DEBUG_PEOPLECD_DEBUG_SHOW_PARMSRT" },
  { key: "PC2048", elId: "DEBUG_PEOPLECD_DEBUG_SHOW_EACH" },
];

const SQL_OPTS: TraceOpt[] = [
  { key: "SQL0001", elId: "TRACE_SQL_TRACE_SQL_STMT" },
  { key: "SQL0002", elId: "TRACE_SQL_TRACE_SQL_BIND" },
  { key: "SQL0004", elId: "TRACE_SQL_TRACE_SQL_CURSOR" },
  { key: "SQL0008", elId: "TRACE_SQL_TRACE_SQL_FETCH" },
  { key: "SQL0016", elId: "TRACE_SQL_TRACE_SQL_API" },
  { key: "SQL0032", elId: "TRACE_SQL_TRACE_SQL_SSB" },
  { key: "SQL0064", elId: "TRACE_SQL_TRACE_SQL_DB" },
  { key: "SQL4096", elId: "TRACE_SQL_TRACE_SQL_MGR" },
];

function flagBit(on: YesNo, bit: number): number {
  return on === "Yes" ? bit : 0;
}

export function computePeopleCodeMask(t: TraceSettings): number {
  return (
    flagBit(t.PC0001, 1) |
    flagBit(t.PC0002, 2) |
    flagBit(t.PC0004, 4) |
    flagBit(t.PC0008, 8) |
    flagBit(t.PC0016, 16) |
    flagBit(t.PC0064, 64) |
    flagBit(t.PC0128, 128) |
    flagBit(t.PC0256, 256) |
    flagBit(t.PC0512, 512) |
    flagBit(t.PC1024, 1024) |
    flagBit(t.PC2048, 2048)
  );
}

export function computeSqlMask(t: TraceSettings): number {
  return (
    flagBit(t.SQL0001, 1) |
    flagBit(t.SQL0002, 2) |
    flagBit(t.SQL0004, 4) |
    flagBit(t.SQL0008, 8) |
    flagBit(t.SQL0016, 16) |
    flagBit(t.SQL0032, 32) |
    flagBit(t.SQL0064, 64) |
    flagBit(t.SQL4096, 4096)
  );
}

function selectedOpts(
  settings: TraceSettings,
  opts: TraceOpt[],
  turnOn: boolean,
): Array<{ elId: string; selected: boolean }> {
  // Each SQL bit must address its own checkbox; never alias Fetch to Cursor.
  const byId = new Map<string, boolean>();
  for (const o of opts) {
    const on = turnOn && isYes(settings[o.key]);
    byId.set(o.elId, (byId.get(o.elId) ?? false) || on);
  }
  return [...byId.entries()].map(([elId, selected]) => ({ elId, selected }));
}

function absoluteUrl(baseURL: string, action: string, fallback: string): string {
  try {
    const target = new URL(action || fallback, fallback);
    return target.origin === new URL(baseURL).origin && !target.username && !target.password
      ? target.href : "";
  } catch {
    return "";
  }
}

export type TraceApplyResult = "ok" | "locked" | "fail";

/** Exported for unit tests — one UTILITIES.* component round-trip. */
export async function applyTraceComponent(
  baseURL: string,
  siteNormalized: string,
  portal: string,
  node: string,
  menuComp: string,
  opts: Array<{ elId: string; selected: boolean }>,
  fetchImpl: typeof fetch = fetch,
  canContinue: () => Promise<boolean> = async () => true,
): Promise<TraceApplyResult> {
  if (!await canContinue()) return "fail";
  const openUrl = `${baseURL}/psc/${siteNormalized}_newwin/${portal}/${node}/c/${menuComp}`;
  let getRes: Response;
  try {
    getRes = await fetchImpl(openUrl, { credentials: "same-origin", redirect: "error" });
  } catch {
    return "fail";
  }
  if (getRes.status === 401 || getRes.status === 403) return "locked";
  if (!getRes.ok) return "fail";

  const html = await getRes.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc.body || doc.body.children.length === 0) return "locked";

  for (const o of opts) {
    if (!doc.getElementById(o.elId)) return "locked";
  }

  const icsid = (doc.getElementById("ICSID") as HTMLInputElement | null)?.value;
  const elementNum = (doc.getElementById("ICElementNum") as HTMLInputElement | null)?.value;
  const stateEl = doc.getElementById("ICStateNum") as HTMLInputElement | null;
  const stateNum = stateEl?.value;
  const form = stateEl?.form;
  if (!icsid || elementNum == null || stateNum == null || !form) return "fail";

  const formAction = absoluteUrl(baseURL, form.getAttribute("action") || "", openUrl);
  if (!formAction) return "fail";
  const params = [
    "ICAJAX=1",
    "ICNAVTYPEDROPDOWN=1",
    "ICType=Panel",
    `ICElementNum=${encodeURIComponent(elementNum)}`,
    `ICStateNum=${encodeURIComponent(stateNum)}`,
    "ICAction=%23ICSave",
    "ICXPos=0",
    "ICYPos=0",
    "ResponsetoDiffFrame=-1",
    "TargetFrameName=None",
    "FacetPath=None",
    "ICFocus=",
    "ICSaveWarningFilter=0",
    "ICChanged=0",
    "ICResubmit=0",
    `ICSID=${encodeURIComponent(icsid)}`,
    "ICActionPrompt=false",
    "ICFind=",
    "ICAddCount=",
    "ICAPPCLSDATA=",
  ];
  for (const o of opts) {
    const yn = o.selected ? "Y" : "N";
    params.push(`${o.elId}=${yn}`);
    params.push(`${o.elId}$chk=${yn}`);
  }

  let postRes: Response;
  if (!await canContinue()) return "fail";
  try {
    postRes = await fetchImpl(formAction, {
      method: "POST",
      credentials: "same-origin",
      redirect: "error",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.join("&"),
    });
  } catch {
    return "fail";
  }
  if (postRes.status === 401 || postRes.status === 403) return "locked";
  if (!postRes.ok) return "fail";

  const resp = await postRes.text();
  const m = resp.match(/processing_win[\d]*\(([\d]),[\d]*\)/);
  return m && m[1] === "2" ? "ok" : "fail";
}

/**
 * Toggle PeopleCode + SQL session trace using delivered utilities components.
 * Uses authenticated session cookies; does not store credentials.
 */
export async function toggleTrace(
  settings: MpuSettings,
  parsed: ParsedPsUrl,
  envIndex: number,
  turnOn: boolean,
): Promise<{ running: boolean; locked: boolean }> {
  if (!parsed.baseURL || !parsed.siteNormalized || !parsed.portal || !parsed.node) {
    announce(document, "Cannot resolve trace component URLs");
    return { running: false, locked: false };
  }

  const approval = turnOn ? await authorizeWriteAction(document, parsed, "traceOption", "Start PeopleCode and SQL trace") : null;
  if (turnOn && !approval) {
    announce(document, "Trace start cancelled — access or environment changed, or confirmation was cancelled.");
    return { running: isYes(settings.environments[envIndex]?.trcProfRunning), locked: false };
  }
  if (approval) settings = approval.settings;

  const canContinue = async () => {
    if (document.location.href !== parsed.href) return false;
    if (approval) {
      const approvedIndex = approval.settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized]?.envId ?? -1;
      return approvedIndex === envIndex && await approval.canContinue();
    }
    const current = await currentPageAccess(parsed, "traceOption");
    if (!current || !originAllowed(parsed.baseURL, current)) return false;
    const mapping = current.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
    return document.location.href === parsed.href && (mapping?.envId ?? -1) === envIndex &&
      (envIndex < 0 || isYes(current.environments[envIndex]?.active));
  };
  if (!await canContinue()) {
    announce(document, "Trace request cancelled — this page or feature is disabled.");
    return { running: isYes(settings.environments[envIndex]?.trcProfRunning), locked: false };
  }
  const request = { origin: new URL(parsed.baseURL).origin, site: parsed.siteNormalized,
    at: Date.now(), target: turnOn ? "on" as const : "off" as const, status: "requested" as const };
  if (envIndex >= 0) await updateSettings((s) => {
    if (!s.environments[envIndex]) return s;
    s.environments[envIndex].traceRequest = request;
    return s;
  });

  const pcOpts = selectedOpts(settings.traceSettings, PC_OPTS, turnOn);
  const sqlOpts = selectedOpts(settings.traceSettings, SQL_OPTS, turnOn);

  const pc = await applyTraceComponent(
    parsed.baseURL,
    parsed.siteNormalized,
    parsed.portal,
    parsed.node,
    "UTILITIES.PEOPLECODE_TRACE.GBL",
    pcOpts,
    fetch,
    canContinue,
  );
  const sql = await applyTraceComponent(
    parsed.baseURL,
    parsed.siteNormalized,
    parsed.portal,
    parsed.node,
    "UTILITIES.TRACE_SQL.GBL",
    sqlOpts,
    fetch,
    canContinue,
  );

  const locked = pc === "locked" || sql === "locked";
  const succeeded = pc === "ok" && sql === "ok";
  // A failed/partial stop does not prove that tracing stopped. Keep Stop available.
  const running = succeeded ? turnOn : turnOn
    ? pc === "ok" || sql === "ok"
    : isYes(settings.environments[envIndex]?.trcProfRunning);

  if (envIndex >= 0 && envIndex < settings.environments.length) {
    await updateSettings((s) => {
      if (!s.environments[envIndex] || (s.urlSites[parsed.baseURL]?.[parsed.siteNormalized]?.envId ?? envIndex) !== envIndex) return s;
      const environments = [...s.environments];
      environments[envIndex] = {
        ...environments[envIndex],
        trcProfRunning: running ? "Yes" : "No",
        traceRequest: { ...request, at: Date.now(), status: succeeded ? "confirmed" : "incomplete" },
      };
      return { ...s, environments };
    });
  }

  getExtensionApi().runtime.sendMessage({
    type: "mpu-trace-sync",
    envIndex,
    running,
  });

  announce(
    document,
    !succeeded
      ? "Trace request incomplete — tracing may still be active. Verify PeopleCode and SQL trace settings in PeopleSoft."
      : `Trace ${running ? "ON" : "OFF"} save requests acknowledged. Verify the current state in PeopleSoft.`,
  );

  return { running, locked };
}
