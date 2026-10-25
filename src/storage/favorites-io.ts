import { parseDelimited } from "./delimited";
import type { Favorite } from "./schema";

const CSV_HEADER =
  "Servlet,Menu,Component,Market,Parameters,Category,SubCategory,Description,Notes";

export function favoritesToCsv(favs: Favorite[]): string {
  const rows = favs.map((f) =>
    [
      f.Servlet,
      f.Menu,
      f.Component,
      f.Market,
      f.Parameters,
      f.Category,
      f.SubCategory,
      f.Description,
      f.Notes || "",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [CSV_HEADER, ...rows].join("\n");
}

/** Split one CSV line, honoring RFC-style quotes and `""` escapes. */
export function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cols.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

export function parseFavoritesCsv(text: string): Favorite[] {
  const rows = parseDelimited(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  if (header.slice(0, 8).join(",") !== CSV_HEADER.split(",").slice(0, 8).join(",")) {
    throw new Error("Unrecognized favorites CSV header");
  }
  return rows.slice(1).map((cols) => {
    if (cols.length !== header.length || !["psp", "psc"].includes(cols[0]) || !cols[1] || !cols[2]) {
      throw new Error("Invalid favorite row");
    }
    return {
      Servlet: (cols[0] === "psc" ? "psc" : "psp") as "psp" | "psc",
      Menu: cols[1] || "",
      Component: cols[2] || "",
      Market: cols[3] || "GBL",
      Parameters: cols[4] || "",
      Category: cols[5] || "",
      SubCategory: cols[6] || "",
      Description: cols[7] || "",
      ...(cols[8]?.trim() ? { Notes: cols[8].trim() } : {}),
    };
  });
}

export { isSettingsBackup } from "./backup";
