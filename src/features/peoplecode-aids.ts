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
}): PeopleCodeEventStub[] {
  const record = input.record || "RECORD";
  const field = input.field || "FIELD";
  const component = input.component || "COMPONENT";
  const page = input.page || "PAGE";
  const row = input.occurrence != null && input.occurrence !== "" ? input.occurrence : "1";

  return [
    {
      id: "fieldchange",
      label: "FieldChange",
      scope: "field",
      stub: `/* ${record}.${field}.FieldChange */\nLocal Field &Fld = GetField(Field.${field});\n`,
    },
    {
      id: "fieldedit",
      label: "FieldEdit",
      scope: "field",
      stub: `/* ${record}.${field}.FieldEdit */\nIf None(GetField(Field.${field}).Value) Then\n   Error MsgGet(0, 0, "Required field.");\nEnd-If;\n`,
    },
    {
      id: "rowinit",
      label: "RowInit",
      scope: "record",
      stub: `/* ${record}.RowInit */\nLocal Row &Row = GetRow();\nLocal Record &Rec = &Row.GetRecord(Record.${record});\n`,
    },
    {
      id: "saveprechange",
      label: "SavePreChange",
      scope: "record",
      stub: `/* ${record}.SavePreChange */\nLocal Record &Rec = GetRecord(Record.${record});\n`,
    },
    {
      id: "component-prebuild",
      label: "Component PreBuild",
      scope: "component",
      stub: `/* Component ${component} PreBuild */\n/* Page context: ${page} */\n`,
    },
    {
      id: "component-postbuild",
      label: "Component PostBuild",
      scope: "component",
      stub: `/* Component ${component} PostBuild */\n/* Menu: ${input.menu || "MENU"} */\n`,
    },
    {
      id: "getrowset",
      label: "GetRowset / GetRow",
      scope: "field",
      stub: `Local Rowset &Rs = GetLevel0();\nLocal Row &Row = &Rs.GetRow(${row});\nLocal Record &Rec = &Row.GetRecord(Record.${record});\nLocal Field &Fld = &Rec.GetField(Field.${field});\n`,
    },
  ];
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
