import { getTargetDocument } from "../adapters/ps-page";

export type FluidStructureKind =
  | "group"
  | "scroll"
  | "grid"
  | "subpage"
  | "tab"
  | "section"
  | "other";

export interface FluidStructureNode {
  kind: FluidStructureKind;
  label: string;
  id?: string;
  depth: number;
}

const KIND_SELECTORS: Array<{ kind: FluidStructureKind; sel: string }> = [
  { kind: "group", sel: ".ps_box-group, .ps_box-grp, [class*='ps_box-group']" },
  { kind: "scroll", sel: ".ps_box-scroll, [class*='ps_box-scroll'], .PSLEVEL1SCROLLAREABODY" },
  { kind: "grid", sel: ".ps_box-grid, .ps_grid-flex, table.PSLEVEL1GRID, [class*='ps_box-grid']" },
  { kind: "subpage", sel: ".ps_box-subpage, [class*='ps_box-subpage'], iframe.ps_target-iframe" },
  { kind: "tab", sel: ".ps_box-tab, .ps_tabs, #pstabs, [role='tablist']" },
  { kind: "section", sel: "section, [role='region'], .ps_box-section" },
];

function nodeLabel(el: Element, kind: FluidStructureKind): string {
  const titled =
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    el.getAttribute("data-label") ||
    "";
  if (titled.trim()) return titled.replace(/\s+/g, " ").trim().slice(0, 80);

  const heading = el.querySelector("h1, h2, h3, h4, .ps_box-label, legend, caption");
  const ht = heading?.textContent?.replace(/\s+/g, " ").trim();
  if (ht) return ht.slice(0, 80);

  if (el.id) return `${kind}:${el.id}`.slice(0, 80);
  const cls = typeof el.className === "string" ? el.className.split(/\s+/).find(Boolean) : "";
  return cls ? `${kind}:${cls}` : kind;
}

function depthFrom(el: Element, root: Element): number {
  let d = 0;
  let cur: Element | null = el;
  while (cur && cur !== root) {
    d += 1;
    cur = cur.parentElement;
  }
  return Math.min(d, 12);
}

/** Read-only Fluid/Classic structure inventory from DOM (FL-01). */
export function collectFluidStructure(doc: Document = document, limit = 40): FluidStructureNode[] {
  const target = getTargetDocument(doc);
  const root = target.body || target.documentElement;
  if (!root) return [];

  const out: FluidStructureNode[] = [];
  const seen = new Set<string>();

  for (const { kind, sel } of KIND_SELECTORS) {
    for (const el of Array.from(root.querySelectorAll(sel))) {
      if (!(el instanceof HTMLElement)) continue;
      const label = nodeLabel(el, kind);
      const key = `${kind}|${el.id || ""}|${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        kind,
        label,
        id: el.id || undefined,
        depth: depthFrom(el, root),
      });
      if (out.length >= limit) return out;
    }
  }

  out.sort((a, b) => a.depth - b.depth || a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
  return out;
}

export function formatFluidStructurePlain(nodes: FluidStructureNode[]): string {
  if (!nodes.length) return "No Fluid/Classic structure hosts detected on this page.";
  return nodes
    .map((n) => `${"  ".repeat(Math.max(0, n.depth - 1))}[${n.kind}] ${n.label}${n.id ? ` (#${n.id})` : ""}`)
    .join("\n");
}
