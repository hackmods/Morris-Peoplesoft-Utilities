import type { ConfigurationEntry } from "./configuration-comparison";

export interface IbEvidenceField extends ConfigurationEntry { payloadLine?: number }

/** MPU XML subset v1: small, inert XML/SOAP excerpts. Never insert these nodes
 * into a live document. Opening-tag lines refer to the decoded payload string. */
export function parseIbXml(entry: ConfigurationEntry): IbEvidenceField[] {
  const fail = (): never => { throw new Error("Unsupported XML payload subset."); };
  if (typeof entry.value !== "string" || entry.value.length > 4_000) return fail();
  let xml = entry.value.replace(/^\ufeff/, "");
  const declaration = /^\s*<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?(?:\s+standalone=["'](?:yes|no)["'])?\s*\?>/i;
  // Preflight precedes DOMParser: no DTDs, entities, stylesheet or other PIs.
  const withoutDeclaration = xml.replace(declaration, "");
  if (withoutDeclaration.includes("<?") || /<!(?!--|\[CDATA\[)/.test(withoutDeclaration)
    || withoutDeclaration.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-fA-F]+);/g, "").includes("&")) return fail();
  xml = xml.replace(/\r\n|\r/g, "\n");
  const starts: { name: string; line: number }[] = [];
  let index = 0; let line = 1;
  while (index < xml.length) {
    const start = index; const tagLine = line;
    if (xml.startsWith("<!--", index) || xml.startsWith("<![CDATA[", index) || xml.startsWith("<?", index)) {
      const endToken = xml.startsWith("<!--", index) ? "-->" : xml.startsWith("<![CDATA[", index) ? "]]>" : "?>";
      const end = xml.indexOf(endToken, index + 2); if (end < 0) return fail(); index = end + endToken.length;
    } else if (xml[index] === "<") {
      let quote = ""; index++;
      for (; index < xml.length; index++) {
        const char = xml[index];
        if (quote) { if (char === quote) quote = ""; }
        else if (char === '"' || char === "'") quote = char;
        else if (char === ">") break;
      }
      if (index === xml.length) return fail(); index++;
      const token = xml.slice(start, index);
      if (!token.startsWith("</")) {
        const name = /^<([A-Za-z_][A-Za-z\d_.:-]*)(?=\s|\/?>)/.exec(token)?.[1];
        if (!name) return fail(); starts.push({ name, line: tagLine });
      }
    } else { const end = xml.indexOf("<", index); index = end < 0 ? xml.length : end; }
    line += xml.slice(start, index).split("\n").length - 1;
  }
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  if (parsed.doctype || parsed.getElementsByTagName("parsererror").length || !parsed.documentElement) return fail();
  const out: IbEvidenceField[] = [];
  const pointer = (parts: string[]) => `/${parts.map(part => part.replace(/~/g, "~0").replace(/\//g, "~1")).join("/")}`;
  const add = (parts: string[], value: string | null, payloadLine: number) => {
    if (parts.length > 16 || parts.some(part => part.length > 256) || out.length >= 2_000) return fail();
    out.push({ path: pointer(parts), normalizedPath: pointer(parts), segments: parts, value, valueType: value === null ? "object" : "string", sourceLine: entry.sourceLine, payloadLine, sensitive: false });
  };
  add(entry.segments, null, 1);
  let tagIndex = 0;
  const walk = (element: Element, parent: string[], occurrence: number) => {
    const token = starts[tagIndex++]; if (!token || token.name !== element.nodeName) return fail();
    const parts = [...parent, `${element.nodeName}[${occurrence}]`]; add(parts, null, token.line);
    for (const attr of Array.from(element.attributes)) {
      // Namespace declarations are not endpoints and are omitted, never resolved.
      if (attr.name === "xmlns" || attr.prefix === "xmlns") continue;
      add([...parts, `@${attr.name}`], attr.value, token.line);
    }
    const text = Array.from(element.childNodes).filter(node => node.nodeType === 3 || node.nodeType === 4).map(node => node.nodeValue ?? "").join("");
    if (text.trim() || !element.children.length) add([...parts, "#text"], text, token.line);
    const counts = new Map<string, number>();
    for (const child of Array.from(element.children)) {
      const count = (counts.get(child.nodeName) ?? 0) + 1; counts.set(child.nodeName, count); walk(child, parts, count);
    }
  };
  walk(parsed.documentElement, entry.segments, 1);
  if (tagIndex !== starts.length) return fail();
  return out;
}
