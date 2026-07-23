import {
  detectFluidCrefPath,
  detectFluidTheme,
  type PageMeta,
  type ParsedPsUrl,
} from "./ps-page";

export type EnvContextRow = { label: string; value: string };

/** Rows for the Env flyout (site / portal / node / ToolsRel / theme / CREF). */
export function buildEnvContextRows(
  meta: PageMeta,
  parsed: ParsedPsUrl,
  envLabel: string,
  doc: Document = document,
): EnvContextRow[] {
  const rows: EnvContextRow[] = [
    { label: "Environment", value: envLabel.trim() || "—" },
    { label: "Site", value: parsed.site || parsed.siteNormalized || "—" },
    { label: "Portal", value: parsed.portal || "—" },
    { label: "Node", value: parsed.node || "—" },
    { label: "ToolsRel", value: meta.toolsRel ?? "—" },
  ];
  const theme = detectFluidTheme(doc);
  if (theme) rows.push({ label: "Theme", value: theme });
  const crefPath = detectFluidCrefPath(doc);
  if (crefPath) rows.push({ label: "CREF path", value: crefPath });
  return rows;
}

/** Plain-text Env context for clipboard. */
export function formatEnvContextPlain(
  meta: PageMeta,
  parsed: ParsedPsUrl,
  envLabel: string,
  doc: Document = document,
): string {
  return buildEnvContextRows(meta, parsed, envLabel, doc)
    .map((r) => `${r.label}: ${r.value}`)
    .join("\n");
}
