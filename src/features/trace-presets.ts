import { DEFAULT_TRACE, type TraceSettings, type YesNo } from "../storage/schema";

export type TracePresetId = "off" | "default" | "sql" | "peoplecode" | "verbose";

export const TRACE_PRESET_META: Array<{ id: TracePresetId; label: string; hint: string }> = [
  { id: "off", label: "Off", hint: "Clear all PeopleCode and SQL flags" },
  { id: "default", label: "Default", hint: "PC assign + start; SQL statement + bind" },
  { id: "sql", label: "SQL", hint: "SQL statement + bind only" },
  { id: "peoplecode", label: "PeopleCode", hint: "PC assign + start of programs" },
  { id: "verbose", label: "Verbose", hint: "Broader PC + SQL for deep debugging" },
];

function allOff(): TraceSettings {
  const t = { ...DEFAULT_TRACE };
  for (const k of Object.keys(t) as Array<keyof TraceSettings>) {
    t[k] = "No";
  }
  return t;
}

/** Named Trace Options presets (TR-01). */
export function applyTracePreset(id: TracePresetId): TraceSettings {
  switch (id) {
    case "off":
      return allOff();
    case "default":
      return { ...DEFAULT_TRACE };
    case "sql": {
      const t = allOff();
      t.SQL0001 = "Yes";
      t.SQL0002 = "Yes";
      return t;
    }
    case "peoplecode": {
      const t = allOff();
      t.PC0004 = "Yes";
      t.PC0064 = "Yes";
      return t;
    }
    case "verbose": {
      const t = allOff();
      t.PC0001 = "Yes";
      t.PC0004 = "Yes";
      t.PC0064 = "Yes";
      t.PC0128 = "Yes";
      t.PC0256 = "Yes";
      t.SQL0001 = "Yes";
      t.SQL0002 = "Yes";
      t.SQL0004 = "Yes";
      t.SQL4096 = "Yes";
      return t;
    }
    default:
      return { ...DEFAULT_TRACE };
  }
}

const SHORT_LABELS: Array<{ key: keyof TraceSettings; short: string }> = [
  { key: "PC0001", short: "PC Eval" },
  { key: "PC0002", short: "PC List" },
  { key: "PC0004", short: "PC Assign" },
  { key: "PC0008", short: "PC Fetch" },
  { key: "PC0016", short: "PC Stack" },
  { key: "PC0064", short: "PC Start" },
  { key: "PC0128", short: "PC Ext" },
  { key: "PC0256", short: "PC Int" },
  { key: "PC0512", short: "PC Parms" },
  { key: "PC1024", short: "PC RetParms" },
  { key: "PC2048", short: "PC Each" },
  { key: "SQL0001", short: "SQL Stmt" },
  { key: "SQL0002", short: "SQL Bind" },
  { key: "SQL0004", short: "SQL Cursor" },
  { key: "SQL0008", short: "SQL Fetch" },
  { key: "SQL0016", short: "SQL API" },
  { key: "SQL0032", short: "SQL SSB" },
  { key: "SQL0064", short: "SQL DB" },
  { key: "SQL4096", short: "SQL Mgr" },
];

/** Human-readable summary of which flags are currently Yes. */
export function summarizeActiveTraceFlags(t: TraceSettings): string {
  const on = SHORT_LABELS.filter((f) => t[f.key] === ("Yes" as YesNo)).map((f) => f.short);
  return on.length ? on.join(" · ") : "None (all off)";
}
