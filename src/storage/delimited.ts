/** Parse CSV/TSV records, preserving quoted newlines and trailing empty cells. */
export function parseDelimited(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { value += '"'; i++; }
      else if (quoted || value === "") quoted = !quoted;
      else value += ch;
    } else if (!quoted && ch === delimiter) {
      row.push(value); value = "";
    } else if (!quoted && (ch === "\r" || ch === "\n")) {
      row.push(value);
      rows.push(row);
      row = []; value = "";
      if (ch === "\r" && input[i + 1] === "\n") i++;
    } else value += ch;
  }
  if (quoted) throw new Error("Unclosed quoted cell");
  row.push(value);
  if (row.length > 1 || value !== "" || input.endsWith('"')) rows.push(row);
  return rows;
}
