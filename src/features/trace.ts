import type { MpuSettings, TraceSettings, YesNo } from "../storage/schema";
import type { ParsedPsUrl } from "../adapters/ps-page";
import { updateSettings } from "../storage/settings";
import { announce } from "./bar";

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

function componentUrl(parsed: ParsedPsUrl, menu: string, component: string): string | null {
  if (!parsed.baseURL || !parsed.servlet || !parsed.siteNormalized) return null;
  return `${parsed.baseURL}/${parsed.servlet}/${parsed.siteNormalized}/${parsed.portal}/${parsed.node}/c/${menu}.${component}.GBL`;
}

async function postTraceSave(
  url: string,
  body: string,
): Promise<{ ok: boolean; locked: boolean }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (res.status === 403 || res.status === 401) return { ok: false, locked: true };
    return { ok: res.ok, locked: false };
  } catch {
    return { ok: false, locked: false };
  }
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
  const pcUrl = componentUrl(parsed, "UTILITIES", "PEOPLECODE_TRACE");
  const sqlUrl = componentUrl(parsed, "UTILITIES", "TRACE_SQL");
  if (!pcUrl || !sqlUrl) {
    announce(document, "Cannot resolve trace component URLs");
    return { running: false, locked: false };
  }

  const pcMask = turnOn ? computePeopleCodeMask(settings.traceSettings) : 0;
  const sqlMask = turnOn ? computeSqlMask(settings.traceSettings) : 0;

  // ICAjax-style panel save — best-effort; PS versions vary
  const pcBody = `ICType=Panel&ICElementNum=0&ICStateNum=1&ICAction=Save&TRACEVALUE=${pcMask}`;
  const sqlBody = `ICType=Panel&ICElementNum=0&ICStateNum=1&ICAction=Save&TRACE_SQL=${sqlMask}`;

  const pc = await postTraceSave(pcUrl, pcBody);
  const sql = await postTraceSave(sqlUrl, sqlBody);
  const locked = pc.locked || sql.locked;
  const running = turnOn && pc.ok && sql.ok && !locked;

  if (envIndex >= 0 && envIndex < settings.environments.length) {
    await updateSettings((s) => {
      const environments = [...s.environments];
      environments[envIndex] = {
        ...environments[envIndex],
        trcProfRunning: running ? "Yes" : "No",
      };
      return { ...s, environments };
    });
  }

  chrome.runtime.sendMessage({
    type: "mpu-trace-sync",
    envIndex,
    running,
  });

  announce(
    document,
    locked
      ? "Trace components not accessible for this user"
      : running
        ? "Trace started"
        : "Trace stopped",
  );

  return { running, locked };
}
