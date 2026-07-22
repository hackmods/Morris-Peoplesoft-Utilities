import { getTargetDocument } from "../adapters/ps-page";

export interface MessageKeyHit {
  /** Stable id for list keys */
  id: string;
  /** Human label, e.g. MsgGet(100, 5) */
  label: string;
  /** Copy-friendly text */
  copyText: string;
  /** Where it was found */
  source: "text" | "attr" | "comment";
}

const MSG_GET_RE = /MsgGet(?:Text)?\s*\(\s*(\d+)\s*,\s*(\d+)/gi;
const MSG_PAIR_RE =
  /Message\s+Set\s*:?\s*(\d+)[\s,;]+(?:Message\s+)?(?:Num(?:ber)?|#)\s*:?\s*(\d+)/gi;
const XLAT_HINT_RE = /\bXLAT(?:\.[A-Z0-9_]+)?\b/gi;
const TRANSLATE_FIELD_RE = /%Translate\s*\(\s*([A-Z0-9_.]+)\s*\)/gi;

function collectTextNodes(doc: Document): string[] {
  const chunks: string[] = [];
  const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const t = node.textContent?.trim();
    if (t && t.length > 2) chunks.push(t);
  }
  return chunks;
}

function collectAttrValues(doc: Document): string[] {
  const out: string[] = [];
  for (const el of Array.from(doc.querySelectorAll("[title], [aria-label], [data-message], [data-msg]"))) {
    for (const attr of ["title", "aria-label", "data-message", "data-msg"]) {
      const v = el.getAttribute(attr);
      if (v?.trim()) out.push(v.trim());
    }
  }
  return out;
}

function collectHtmlComments(doc: Document): string[] {
  const out: string[] = [];
  const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_COMMENT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const t = node.textContent?.trim();
    if (t) out.push(t);
  }
  return out;
}

function addMsgGetHits(text: string, source: MessageKeyHit["source"], seen: Set<string>, out: MessageKeyHit[]): void {
  MSG_GET_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MSG_GET_RE.exec(text))) {
    const set = m[1]!;
    const num = m[2]!;
    const label = `MsgGet(${set}, ${num})`;
    const id = `msgget:${set}:${num}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, copyText: label, source });
    if (out.length >= 20) return;
  }
}

function addMsgPairHits(text: string, source: MessageKeyHit["source"], seen: Set<string>, out: MessageKeyHit[]): void {
  MSG_PAIR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MSG_PAIR_RE.exec(text))) {
    const set = m[1]!;
    const num = m[2]!;
    const label = `Message Set ${set}, Number ${num}`;
    const id = `msgpair:${set}:${num}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, copyText: `MsgGet(${set}, ${num})`, source });
    if (out.length >= 20) return;
  }
}

function addXlatHits(text: string, source: MessageKeyHit["source"], seen: Set<string>, out: MessageKeyHit[]): void {
  XLAT_HINT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = XLAT_HINT_RE.exec(text))) {
    const token = m[0]!;
    const id = `xlat:${token.toUpperCase()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label: token, copyText: token, source });
    if (out.length >= 20) return;
  }

  TRANSLATE_FIELD_RE.lastIndex = 0;
  while ((m = TRANSLATE_FIELD_RE.exec(text))) {
    const field = m[1]!;
    const label = `%Translate(${field})`;
    const id = `translate:${field}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, copyText: label, source });
    if (out.length >= 20) return;
  }
}

/** PC-05: scan visible DOM for Message Catalog / translate hints already on the page. */
export function scanMessageKeys(doc: Document = document, limit = 20): MessageKeyHit[] {
  const target = getTargetDocument(doc);
  const seen = new Set<string>();
  const out: MessageKeyHit[] = [];

  const scan = (text: string, source: MessageKeyHit["source"]): void => {
    if (!text || out.length >= limit) return;
    addMsgGetHits(text, source, seen, out);
    addMsgPairHits(text, source, seen, out);
    addXlatHits(text, source, seen, out);
  };

  for (const t of collectTextNodes(target)) scan(t, "text");
  if (out.length < limit) {
    for (const t of collectAttrValues(target)) scan(t, "attr");
  }
  if (out.length < limit) {
    for (const t of collectHtmlComments(target)) scan(t, "comment");
  }

  return out.slice(0, limit);
}

export function formatMessageKeysPlain(hits: MessageKeyHit[]): string {
  if (!hits.length) return "No Message Catalog or translate keys detected in visible page DOM.";
  return hits.map((h) => h.label).join("\n");
}
