import {
  TRACESQL_FORMAT,
  TRACESQL_LIMITS,
  aggregateByTable,
  aggregateByWhere,
  parseTraceSql,
  renderTraceSqlInvestigations,
  type TracePlanNode,
  type TraceSqlReport,
} from "./tracesql-investigation";

/** Session memory only. Selection never triggers capture or a network call. */
export function bindTraceSqlInvestigationUI(doc: Document, root: HTMLElement): void {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const field = (text: string, control: HTMLElement, id: string) => {
    const label = make("label", text);
    control.id = id;
    label.htmlFor = id;
    const row = make("div");
    row.append(label, control);
    return row;
  };
  const button = (text: string, id: string) => {
    const node = make("button", text);
    node.type = "button";
    node.id = id;
    return node;
  };

  root.classList.add("mpu-comparison", "mpu-tracesql");
  const heading = make("h2", "Trace SQL investigation");
  const intro = make(
    "p",
    "Select one or two sanitized PeopleSoft .tracesql or .trc excerpts, or paste sanitized text, then preview a hotspot report in this browser tab. Two files add a SQLID/FROM compare section. Evidence stays in tab memory until cleared or reloaded. Nothing is saved in extension storage or sent over the network.",
  );
  const scope = make(
    "p",
    `Supported parser: ${TRACESQL_FORMAT}. UTF-8 plain text only: at most ${TRACESQL_LIMITS.maxFiles} files or one paste, ${TRACESQL_LIMITS.maxBytes.toLocaleString()} bytes each, ${TRACESQL_LIMITS.maxLines.toLocaleString()} lines, ${TRACESQL_LIMITS.maxLineChars.toLocaleString()} characters per line. Recognizes clean-room PeopleSoft tracesql markers (COM STMT=SELECT/INSERT/UPDATE/DELETE, Dur=, Bind-, >>> start / <<< end, call). SELECT without PS_/PS tables is ignored. Synthetic samples do not verify real-log compatibility.`,
  );
  const privacy = make(
    "p",
    "Sanitize binds and PII before selecting a file or pasting. Report cells use JSON string escaping; review every unmasked SQL string before copy or download. Filenames are omitted from the report.",
  );
  const agents = make("p");
  agents.append(
    doc.createTextNode("After you review and copy the report, open "),
    (() => {
      const a = make("a", "Options → Agents");
      a.href = "#agents";
      return a;
    })(),
    doc.createTextNode(" and search for "),
    (() => {
      const a = make("a", "assist-tracesql-hotspots");
      a.href = "https://github.com/hackmods/Morris-Peoplesoft-Utilities/tree/main/agents/assist-tracesql-hotspots";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.referrerPolicy = "no-referrer";
      return a;
    })(),
    doc.createTextNode(" (sanitized text only). Do not upload Trace Magic binaries or unsanitized dumps to AI hosts."),
  );
  const files = make("input");
  files.type = "file";
  files.multiple = true;
  files.accept = ".tracesql,.trc,.txt,.log,text/plain";
  const paste = make("textarea");
  paste.rows = 8;
  paste.placeholder = "Optional: paste a sanitized tracesql excerpt when you cannot attach a file";
  paste.setAttribute("spellcheck", "false");
  const status = make("p");
  status.id = "mpu-tracesql-status";
  status.setAttribute("aria-live", "polite");
  status.textContent = "Select one or two sanitized .tracesql / .trc files or paste an excerpt, then Preview.";
  const preview = button("Preview Trace SQL investigation", "mpu-tracesql-preview");
  const clear = button("Clear Trace SQL evidence and report", "mpu-tracesql-clear");
  const report = make("textarea");
  report.rows = 22;
  report.readOnly = true;
  const reviewed = make("input");
  reviewed.type = "checkbox";
  reviewed.disabled = true;
  const copy = button("Copy reviewed Trace SQL report", "mpu-tracesql-copy");
  copy.disabled = true;
  const download = button("Download reviewed Trace SQL report", "mpu-tracesql-download");
  download.disabled = true;

  const grouping = make("section");
  grouping.id = "mpu-tracesql-grouping";
  grouping.hidden = true;
  grouping.setAttribute("aria-label", "Trace SQL grouping");
  const groupingHeading = make("h3", "Filterable grouping (first excerpt)");
  const sqlid = make("input");
  sqlid.type = "search";
  sqlid.placeholder = "SQLID fragment";
  sqlid.autocomplete = "off";
  const fromTable = make("table");
  fromTable.id = "mpu-tracesql-from";
  const whereTable = make("table");
  whereTable.id = "mpu-tracesql-where";
  const planList = make("ol");
  planList.id = "mpu-tracesql-plan";
  const source = make("pre");
  source.id = "mpu-tracesql-source";
  source.tabIndex = 0;
  grouping.append(
    groupingHeading,
    field("Find by SQLID", sqlid, "mpu-tracesql-sqlid"),
    make("h4", "SQL by exact FROM text (aliases retained)"),
    fromTable,
    make("h4", "SQL by WHERE"),
    whereTable,
    make("h4", "Plan tree (click a row to highlight the source line)"),
    planList,
    field("Source excerpt (first file or paste)", source, "mpu-tracesql-source"),
  );

  root.replaceChildren(
    heading,
    intro,
    scope,
    privacy,
    agents,
    field("Sanitized tracesql / trc excerpt", files, "mpu-tracesql-files"),
    field("Sanitized tracesql paste (optional if no file)", paste, "mpu-tracesql-paste"),
    status,
    preview,
    clear,
    grouping,
    field("Trace SQL investigation report", report, "mpu-tracesql-report"),
    field("I reviewed this Trace SQL report for sensitive information and scope", reviewed, "mpu-tracesql-reviewed"),
    copy,
    download,
  );

  let revision = 0;
  let parsed: TraceSqlReport | null = null;
  let sourceLines: string[] = [];

  const fillTable = (table: HTMLTableElement, captionText: string, headers: string[], rows: string[][]) => {
    const caption = make("caption", captionText);
    const head = make("thead");
    const headRow = make("tr");
    for (const header of headers) {
      const cell = make("th", header);
      cell.scope = "col";
      headRow.append(cell);
    }
    head.append(headRow);
    const body = make("tbody");
    for (const values of rows) {
      const row = make("tr");
      for (const value of values) row.append(make("td", value));
      body.append(row);
    }
    table.replaceChildren(caption, head, body);
  };

  const renderSource = (lines: string[]) => {
    source.replaceChildren();
    lines.forEach((line, index) => {
      const span = make("span", line || " ");
      span.dataset.line = String(index + 1);
      span.id = `mpu-tracesql-line-${index + 1}`;
      span.tabIndex = -1;
      source.append(span, doc.createTextNode("\n"));
    });
  };

  const jumpToLine = (line: number) => {
    const target = grouping.querySelector<HTMLElement>(`#mpu-tracesql-line-${line}`);
    if (!target) return;
    grouping.querySelectorAll("[data-current-line]").forEach((node) => node.removeAttribute("data-current-line"));
    target.setAttribute("data-current-line", "true");
    target.scrollIntoView({ block: "nearest" });
    target.focus();
    status.textContent = `Source line ${line} in the first excerpt.`;
  };

  const renderPlan = (nodes: TracePlanNode[]) => {
    planList.replaceChildren();
    for (const node of nodes.slice(0, 200)) {
      const item = make("li");
      const jump = button(`L${node.line} ${node.label}`, "");
      jump.removeAttribute("id");
      jump.dataset.line = String(node.line);
      jump.addEventListener("click", () => jumpToLine(node.line));
      item.append(jump);
      planList.append(item);
    }
  };

  const renderGrouping = (report: TraceSqlReport, filter: string) => {
    const needle = filter.trim().toLowerCase();
    const match = (sqlId: string) => !needle || sqlId.toLowerCase().includes(needle);
    const statements = report.statements.filter((statement) => match(statement.sqlId));
    const fromRows = aggregateByTable(statements)
      .map((row) => [row.kind, row.table, String(row.calls), row.duration.toFixed(3)]);
    const whereRows = aggregateByWhere(statements)
      .map((row) => [row.sqlId, row.table, String(row.calls), row.duration.toFixed(3), row.where.slice(0, 120)]);
    fillTable(fromTable, "SQL by exact FROM text", ["Kind", "FROM text", "Calls", "Duration"], fromRows);
    fillTable(whereTable, "SQL by WHERE / SQLID", ["SQLID", "FROM text", "Calls", "Duration", "WHERE"], whereRows);
    renderPlan(report.plan);
  };

  const hideGrouping = () => {
    parsed = null;
    sourceLines = [];
    grouping.hidden = true;
    sqlid.value = "";
    fromTable.replaceChildren();
    whereTable.replaceChildren();
    planList.replaceChildren();
    source.replaceChildren();
  };

  const invalidate = () => {
    revision++;
    report.value = "";
    reviewed.checked = false;
    reviewed.disabled = true;
    copy.disabled = download.disabled = true;
    preview.disabled = false;
    hideGrouping();
  };
  const reset = () => {
    invalidate();
    files.value = "";
    paste.value = "";
    status.textContent = "Trace SQL evidence and report cleared from this tab. Select a file or paste an excerpt to continue.";
  };

  files.addEventListener("change", () => {
    invalidate();
    const selected = Array.from(files.files ?? []);
    status.textContent = selected.length
      ? `Selected ${selected.map((file) => `${file.name} (${file.size.toLocaleString()} bytes)`).join("; ")}. Files win over paste. Prepare a fresh preview.`
      : "File selection cleared. Paste an excerpt or choose a file, then Preview.";
  });
  paste.addEventListener("input", () => {
    invalidate();
    status.textContent = files.files?.length
      ? "Paste changed; selected files still win on Preview. Prepare a fresh preview."
      : "Paste changed. Prepare a fresh preview.";
  });
  sqlid.addEventListener("input", () => {
    if (parsed) renderGrouping(parsed, sqlid.value);
  });
  clear.addEventListener("click", reset);
  doc.defaultView?.addEventListener("pagehide", reset);
  reviewed.addEventListener("change", () => {
    copy.disabled = download.disabled = !reviewed.checked || !report.value;
  });

  preview.addEventListener("click", () => {
    invalidate();
    const generation = revision;
    const selected = Array.from(files.files ?? []);
    const pasted = paste.value;
    if (selected.length > TRACESQL_LIMITS.maxFiles) {
      status.textContent = `Select at most ${TRACESQL_LIMITS.maxFiles} sanitized tracesql or trc excerpts.`;
      return;
    }
    if (!selected.length && !pasted.trim()) {
      status.textContent = "Select one or two sanitized tracesql or trc excerpts, or paste sanitized text.";
      return;
    }
    if (selected.some((file) => file.size > TRACESQL_LIMITS.maxBytes)) {
      status.textContent = "A selected file exceeds the size limit above. Use a smaller excerpt.";
      return;
    }
    if (!selected.length && new TextEncoder().encode(pasted).length > TRACESQL_LIMITS.maxBytes) {
      status.textContent = "Paste exceeds the size limit above. Use a smaller excerpt.";
      return;
    }
    preview.disabled = true;
    status.textContent = selected.length ? "Reading selected excerpt(s) locally…" : "Preparing pasted excerpt locally…";
    void (async () => {
      const texts = selected.length
        ? await Promise.all(selected.map((file) => file.arrayBuffer().then((buffer) => new TextDecoder("utf-8", { fatal: true }).decode(buffer))))
        : [pasted];
      if (generation !== revision || !root.isConnected) return;
      if (texts.some((text) => !text.trim())) {
        status.textContent = "Excerpt is empty. Provide sanitized tracesql text, then Preview again.";
        return;
      }
      report.value = renderTraceSqlInvestigations(texts);
      parsed = parseTraceSql(texts[0]);
      sourceLines = texts[0].replace(/^\ufeff/, "").split(/\r\n|\r|\n/);
      renderSource(sourceLines);
      renderGrouping(parsed, sqlid.value);
      grouping.hidden = false;
      reviewed.disabled = false;
      report.focus();
      status.textContent =
        "Preview ready. Filter FROM/WHERE by SQLID or open a plan row to highlight the source line, then check the review box to enable copy or download.";
    })()
      .catch(() => {
        if (generation !== revision || !root.isConnected) return;
        hideGrouping();
        status.textContent =
          "Cannot prepare this investigation. Check UTF-8 text, nonempty excerpt, line/file limits and report size. No partial report is available.";
      })
      .finally(() => {
        if (generation === revision) preview.disabled = false;
      });
  });

  copy.addEventListener("click", () => {
    if (!reviewed.checked || !report.value) return;
    const generation = revision;
    void Promise.resolve()
      .then(() => navigator.clipboard.writeText(report.value))
      .then(() => {
        if (generation === revision) {
          status.textContent =
            "Reviewed Trace SQL report copied. Next: Options → Agents → assist-tracesql-hotspots with this sanitized text only.";
        }
      })
      .catch(() => {
        if (generation === revision) {
          report.focus();
          report.select();
          status.textContent =
            "Copy unavailable. Select and copy the reviewed report manually, then open Options → Agents for assist-tracesql-hotspots.";
        }
      });
  });

  download.addEventListener("click", () => {
    if (!reviewed.checked || !report.value) return;
    const url = URL.createObjectURL(new Blob([report.value], { type: "text/plain;charset=utf-8" }));
    const link = make("a");
    link.href = url;
    link.download = "mpu-tracesql-investigation.txt";
    link.click();
    URL.revokeObjectURL(url);
    status.textContent =
      "Reviewed Trace SQL report downloaded. Next: Options → Agents → assist-tracesql-hotspots with this sanitized text only.";
  });
}
