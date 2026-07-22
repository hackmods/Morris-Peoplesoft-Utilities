import { getTargetDocument } from "../adapters/ps-page";
import type { ParsedPsUrl } from "../adapters/ps-page";

export interface IbBreadcrumb {
  serviceOperation?: string;
  queue?: string;
  node?: string;
  message?: string;
  /** Compact single-line summary */
  summary: string;
}

const IB_MENU_RE = /^IB_/i;
const IB_COMPONENT_RE = /^(IB_|INTFC|MSG|ASYNC|SYNC)/i;

const LABEL_PATTERNS: Array<{ key: keyof Omit<IbBreadcrumb, "summary">; re: RegExp }> = [
  { key: "serviceOperation", re: /service\s+operation\s*:?\s*(.+)/i },
  { key: "queue", re: /(?:message\s+)?queue\s*:?\s*(.+)/i },
  { key: "node", re: /(?:remote\s+)?node\s*(?:name)?\s*:?\s*(.+)/i },
  { key: "message", re: /message\s*(?:name|id)?\s*:?\s*(.+)/i },
];

function cleanValue(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 120);
}

function valueFromLabelRow(doc: Document, labelRe: RegExp): string | undefined {
  for (const el of Array.from(doc.querySelectorAll("label, span, th, td, .PSEDITBOXLABEL, .ps_box-label"))) {
    const text = el.textContent?.replace(/\s+/g, " ").trim() || "";
    const m = text.match(labelRe);
    if (!m?.[1]) continue;
    const val = cleanValue(m[1]);
    if (val) return val;
    const sibling =
      el.nextElementSibling?.textContent ||
      el.parentElement?.querySelector("input, select, span.PSEDITBOX_DISPONLY, .ps_box-value")?.textContent;
    const sibVal = cleanValue(sibling || "");
    if (sibVal) return sibVal;
  }
  return undefined;
}

function valueFromFieldId(doc: Document, idPart: string): string | undefined {
  const el = doc.querySelector(
    `input[id*="${idPart}" i], span[id*="${idPart}" i], select[id*="${idPart}" i]`,
  );
  const v = el?.textContent || (el as HTMLInputElement | null)?.value;
  const cleaned = cleanValue(v || "");
  return cleaned || undefined;
}

/** AD-02: extract visible IB context from DOM when on Integration Broker pages. */
export function collectIbBreadcrumb(doc: Document = document, parsed?: ParsedPsUrl): IbBreadcrumb | null {
  const target = getTargetDocument(doc);
  const menu = parsed?.menu || "";
  const component = parsed?.component || "";
  const onIbPage =
    IB_MENU_RE.test(menu) ||
    IB_COMPONENT_RE.test(component) ||
    /integration\s+broker/i.test(target.title || "") ||
    !!target.querySelector('[id*="IB_" i], [class*="ibmonitor" i]');

  if (!onIbPage) return null;

  const crumb: IbBreadcrumb = { summary: "" };

  for (const { key, re } of LABEL_PATTERNS) {
    crumb[key] = valueFromLabelRow(target, re);
  }

  crumb.serviceOperation =
    crumb.serviceOperation ||
    valueFromFieldId(target, "SERVICE_OPR") ||
    valueFromFieldId(target, "SERVICEOPR");
  crumb.queue = crumb.queue || valueFromFieldId(target, "QUEUE") || valueFromFieldId(target, "MSG_QUEUE");
  crumb.node = crumb.node || valueFromFieldId(target, "NODE") || valueFromFieldId(target, "RMT_NODE");
  crumb.message = crumb.message || valueFromFieldId(target, "MESSAGE") || valueFromFieldId(target, "MSGID");

  const parts: string[] = [];
  if (crumb.serviceOperation) parts.push(`SvcOp: ${crumb.serviceOperation}`);
  if (crumb.queue) parts.push(`Queue: ${crumb.queue}`);
  if (crumb.node) parts.push(`Node: ${crumb.node}`);
  if (crumb.message) parts.push(`Msg: ${crumb.message}`);

  if (!parts.length) return null;
  crumb.summary = parts.join(" · ");
  return crumb;
}

export function formatIbBreadcrumbPlain(crumb: IbBreadcrumb): string {
  return crumb.summary;
}
