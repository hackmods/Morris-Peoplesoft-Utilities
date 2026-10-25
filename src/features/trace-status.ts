import type { ParsedPsUrl } from "../adapters/ps-page";
import type { TraceRequest } from "../storage/schema";

export function describeTraceRequest(record: TraceRequest | undefined, parsed: ParsedPsUrl, now = Date.now()): {
  status: "requested" | "last-confirmed" | "unknown"; label: string; detail: string;
} {
  let origin = "";
  try { origin = new URL(parsed.baseURL).origin; } catch { /* Unknown context. */ }
  const scoped = record && record.origin === origin && record.site === parsed.siteNormalized;
  if (!scoped || !record || now < record.at || now - record.at > 15 * 60_000) {
    return { status: "unknown", label: "Trace · unknown", detail: "Current server trace state is unknown. Choose an explicit On or Off request; verify in PeopleSoft." };
  }
  const time = new Date(record.at).toISOString();
  if (record.status === "requested" && now - record.at < 60_000) {
    return { status: "requested", label: "Trace · requested", detail: `Trace ${record.target.toUpperCase()} requested at ${time}; awaiting save responses.` };
  }
  if (record.status !== "confirmed") {
    return { status: "unknown", label: "Trace · unknown", detail: `Last ${record.target.toUpperCase()} request at ${time} is incomplete or unconfirmed. Tracing may still be active; verify in PeopleSoft.` };
  }
  return { status: "last-confirmed", label: `Trace · last ${record.target.toUpperCase()}`, detail: `Both trace save requests were acknowledged at ${time}. This is request history, not a live server query; session expiry or external changes may invalidate it.` };
}
