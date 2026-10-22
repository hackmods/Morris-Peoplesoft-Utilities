import type { ParsedPsUrl } from "../adapters/ps-page";
import type { PageMeta } from "../adapters/ps-page";
import { compareKeyValueBuffer, detectFluidCrefPath, detectFluidTheme } from "../adapters/ps-page";
import type { ParsedRecField } from "./field-inspector";
import { formatGetRowsetCopy, formatRecFieldCopy } from "./field-inspector";

export interface PeopleCodeEventStub {
  id: string;
  label: string;
  scope: "field" | "record" | "component" | "page";
  stub: string;
}

export function buildPeopleCodeStubs(input: {
  record?: string;
  field?: string;
  menu?: string;
  component?: string;
  page?: string;
  occurrence?: string;
  event?: string;
  rowContext?: string;
}): PeopleCodeEventStub[] {
  const { record, field, event, rowContext } = input;
  // The browser cannot determine App Designer event or buffer context. Never
  // generate placeholders or interpolate executable user text/DOM occurrences.
  if (!record || !field || !/^[A-Z][A-Z0-9_]{0,63}$/i.test(record) || !/^[A-Z][A-Z0-9_]{0,63}$/i.test(field)
    || !["FieldChange", "RowInit"].includes(event || "") || !rowContext?.trim() || rowContext.length > 500
    // eslint-disable-next-line no-control-regex
    || /[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/.test(rowContext)) return [];
  const context = rowContext.replace(/\/\*/g, "/ *").replace(/\*\//g, "* /");
  return [{ id: event!.toLowerCase(), label: event!, scope: "field",
    stub: `/* Adapt in ${record}.${field}.${event}; requires the intended component-buffer row. */\n/* Developer-supplied row/scroll context (unverified): ${context} */\n/* DOM occurrence does not identify a PeopleCode row or scroll path. */\nLocal Row &Row = GetRow();\nLocal Record &Rec = &Row.GetRecord(Record.${record});\nLocal Field &Fld = &Rec.GetField(Field.${field});\n/* Add and test event-specific logic in App Designer. */\n` }];
}

export const OBJECT_PACK_COMPARE_KEYS = [
  "Menu",
  "Component",
  "Page",
  "Market",
  "Portal",
  "Node",
  "Site",
  "UI",
  "ToolsRel",
  "DB",
  "Locked field",
  "CREF path",
  "Theme",
] as const;

export function formatObjectPackPlain(input: {
  parsed: ParsedPsUrl;
  meta: PageMeta;
  lockedField?: string | null;
  doc?: Document;
}): string {
  const { parsed, meta, lockedField, doc } = input;
  const crefPath = doc ? detectFluidCrefPath(doc) : detectFluidCrefPath();
  const theme = doc ? detectFluidTheme(doc) : detectFluidTheme();
  const lines = [
    `Menu: ${meta.menu ?? parsed.menu ?? "—"}`,
    `Component: ${meta.component ?? parsed.component ?? "—"}`,
    `Page: ${meta.page ?? "—"}`,
    `Market: ${parsed.market ?? "—"}`,
    `Portal: ${parsed.portal || "—"}`,
    `Node: ${parsed.node || "—"}`,
    `Site: ${parsed.siteNormalized || parsed.site || "—"}`,
    `UI: ${meta.uiMode ?? "—"}`,
    `ToolsRel: ${meta.toolsRel ?? "—"}`,
    `DB: ${meta.dbName ?? "—"} (${meta.dbType ?? "—"})`,
  ];
  if (lockedField) lines.push(`Locked field: ${lockedField}`);
  if (crefPath) lines.push(`CREF path: ${crefPath}`);
  if (theme) lines.push(`Theme: ${theme}`);
  return lines.join("\n");
}

/** AD-04: compare object pack clipboard between environments. */
export function compareObjectPackToBuffer(
  currentPlain: string,
  buffer: string,
): { lines: ReturnType<typeof compareKeyValueBuffer>["lines"]; changedCount: number } {
  return compareKeyValueBuffer(currentPlain, buffer, OBJECT_PACK_COMPARE_KEYS);
}

export function formatObjectPackMarkdown(input: {
  parsed: ParsedPsUrl;
  meta: PageMeta;
  lockedField?: string | null;
}): string {
  const plain = formatObjectPackPlain(input);
  return ["### PeopleSoft object pack", "", "```", plain, "```"].join("\n");
}

export function formatRecFieldCopyExtended(
  parsed: ParsedRecField,
  format: "record.field" | "ampersand" | "getfield" | "getrowset",
): string {
  if (format === "getrowset") return formatGetRowsetCopy(parsed);
  return formatRecFieldCopy(parsed, format);
}
