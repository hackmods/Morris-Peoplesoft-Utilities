import { bindModalDialog } from "./dialog";
import {
  TRACESQL_FORMAT,
  TRACESQL_LIMITS,
  aggregateByTable,
  aggregateByWhere,
  parseTraceSqlAsync,
  renderTraceSqlInvestigations,
  renderTraceSqlSqlOnly,
  timedPeopleCodeEnds,
  type TracePlanNode,
  type TraceSqlReport,
  type TraceSqlStatement,
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
  const cancel = button("Cancel Trace SQL preview", "mpu-tracesql-cancel");
  cancel.disabled = true;
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
  const copySql = button("Copy reviewed SQL statements only", "mpu-tracesql-copy-sql");
  copySql.disabled = true;
  const downloadSql = button("Download reviewed SQL statements only", "mpu-tracesql-download-sql");
  downloadSql.disabled = true;

  const grouping = make("section");
  grouping.id = "mpu-tracesql-grouping";
  grouping.hidden = true;
  grouping.setAttribute("aria-label", "Trace SQL grouping");
  const groupingHeading = make("h3", "Filterable grouping (first excerpt)");
  const charts = make("div");
  charts.id = "mpu-tracesql-charts";
  const sqlChart = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  sqlChart.id = "mpu-tracesql-chart-sql";
  const pcChart = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  pcChart.id = "mpu-tracesql-chart-peoplecode";
  charts.append(sqlChart, pcChart);
  const internalTable = make("table");
  internalTable.id = "mpu-tracesql-internal";
  const externalTable = make("table");
  externalTable.id = "mpu-tracesql-external";
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
    charts,
    field("Find by SQLID", sqlid, "mpu-tracesql-sqlid"),
    make("h4", "SQL by exact FROM text (aliases retained)"),
    fromTable,
    make("h4", "SQL by WHERE"),
    whereTable,
    make("h4", "Internal PeopleCode ends"),
    internalTable,
    make("h4", "External PeopleCode ends"),
    externalTable,
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
    cancel,
    clear,
    grouping,
    field("Trace SQL investigation report", report, "mpu-tracesql-report"),
    field("I reviewed this Trace SQL report for sensitive information and scope", reviewed, "mpu-tracesql-reviewed"),
    copy,
    download,
    copySql,
    downloadSql,
  );

  let revision = 0;
  let parsed: TraceSqlReport | null = null;
  let sourceLines: string[] = [];
  let abort: AbortController | null = null;
  let sqlOnly = "";
  let closeOccurrences: (() => void) | null = null;

  const fillTable = (table: HTMLTableElement, captionText: string, headers: string[], rows: Array<Array<string | HTMLElement>>) => {
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
      for (const value of values) {
        const cell = make("td");
        if (typeof value === "string") cell.textContent = value;
        else cell.append(value);
        row.append(cell);
      }
      body.append(row);
    }
    table.replaceChildren(caption, head, body);
  };

  const paintChart = (svg: SVGSVGElement, title: string, rows: Array<{ label: string; duration: number }>) => {
    const ns = "http://www.w3.org/2000/svg";
    const width = 640;
    const barHeight = 18;
    const height = Math.max(48, rows.length * (barHeight + 6) + 28);
    const max = Math.max(0, ...rows.map((row) => row.duration));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${title}: ${rows.map((row) => `${row.label} ${row.duration.toFixed(3)} seconds`).join("; ") || "none"}`);
    svg.replaceChildren();
    const heading = doc.createElementNS(ns, "title");
    heading.textContent = title;
    svg.append(heading);
    rows.slice(0, 12).forEach((row, index) => {
      const y = 24 + index * (barHeight + 6);
      const barWidth = max > 0 ? Math.max(4, (row.duration / max) * 360) : 0;
      const rect = doc.createElementNS(ns, "rect");
      rect.setAttribute("x", "8");
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(barWidth));
      rect.setAttribute("height", String(barHeight));
      rect.setAttribute("fill", "currentColor");
      const label = doc.createElementNS(ns, "text");
      label.setAttribute("x", "380");
      label.setAttribute("y", String(y + 14));
      label.setAttribute("fill", "currentColor");
      label.setAttribute("font-size", "12");
      label.textContent = `${row.duration.toFixed(3)}s ${row.label}`;
      svg.append(rect, label);
    });
  };

  const openOccurrences = (title: string, statements: TraceSqlStatement[]) => {
    closeOccurrences?.();
    const backdrop = make("div");
    backdrop.className = "mpu-tracesql-dialog-backdrop";
    backdrop.id = "mpu-tracesql-dialog";
    const dialog = make("div");
    dialog.className = "mpu-tracesql-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "mpu-tracesql-occ-title");
    const heading = make("h2", title);
    heading.id = "mpu-tracesql-occ-title";
    const list = make("ul");
    list.id = "mpu-tracesql-occurrences";
    for (const statement of statements.slice(0, 80)) {
      const item = make("li");
      const jump = button(
        `L${statement.line} ${statement.kind} exec ${statement.durationExec.toFixed(3)} fetch ${statement.durationFetch.toFixed(3)} SQLID ${statement.sqlId}`,
        "",
      );
      jump.removeAttribute("id");
      jump.addEventListener("click", () => {
        close();
        jumpToLine(statement.line);
      });
      item.append(jump, make("p", statement.sql.slice(0, 300)));
      list.append(item);
    }
    const dismiss = button("Close occurrences", "mpu-tracesql-occ-close");
    dialog.append(heading, list, dismiss);
    backdrop.append(dialog);
    root.append(backdrop);
    const close = bindModalDialog(doc, backdrop, dialog);
    closeOccurrences = close;
    dismiss.addEventListener("click", close);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    dismiss.focus();
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
    const occurrences = (predicate: (statement: TraceSqlStatement) => boolean, title: string) => {
      const node = button("Occurrences", "");
      node.removeAttribute("id");
      node.addEventListener("click", () => openOccurrences(title, report.statements.filter(predicate)));
      return node;
    };
    const fromRows = aggregateByTable(statements).map((row) => [
      row.kind,
      row.table,
      String(row.calls),
      row.durationExec.toFixed(3),
      row.durationFetch.toFixed(3),
      row.duration.toFixed(3),
      occurrences((statement) => statement.kind === row.kind && statement.table === row.table, `Occurrences for ${row.kind} ${row.table}`),
    ]);
    const whereRows = aggregateByWhere(statements).map((row) => [
      row.sqlId,
      row.table,
      String(row.calls),
      row.durationExec.toFixed(3),
      row.durationFetch.toFixed(3),
      row.duration.toFixed(3),
      row.where.slice(0, 120),
      occurrences((statement) => statement.sqlId === row.sqlId, `Occurrences for SQLID ${row.sqlId}`),
    ]);
    fillTable(fromTable, "SQL by exact FROM text", ["Kind", "FROM text", "Calls", "Exec", "Fetch", "Total", "Detail"], fromRows);
    fillTable(whereTable, "SQL by WHERE / SQLID", ["SQLID", "FROM text", "Calls", "Exec", "Fetch", "Total", "WHERE", "Detail"], whereRows);
    fillTable(
      internalTable,
      "Internal PeopleCode ends",
      ["Line", "Name", "PeopleCode", "Duration"],
      timedPeopleCodeEnds(report, false).map((event) => [String(event.line), event.name, event.peopleCode, event.duration.toFixed(3)]),
    );
    fillTable(
      externalTable,
      "External PeopleCode ends",
      ["Line", "Name", "PeopleCode", "Duration"],
      timedPeopleCodeEnds(report, true).map((event) => [String(event.line), event.name, event.peopleCode, event.duration.toFixed(3)]),
    );
    paintChart(sqlChart, "SQL duration by FROM", aggregateByTable(statements).map((row) => ({ label: `${row.kind} ${row.table}`, duration: row.duration })));
    paintChart(
      pcChart,
      "PeopleCode end duration",
      [...timedPeopleCodeEnds(report, false), ...timedPeopleCodeEnds(report, true)].map((event) => ({
        label: `${event.external ? "ext" : "int"} ${event.name} ${event.peopleCode}`,
        duration: event.duration,
      })),
    );
    renderPlan(report.plan);
  };

  const hideGrouping = () => {
    parsed = null;
    sourceLines = [];
    sqlOnly = "";
    grouping.hidden = true;
    sqlid.value = "";
    fromTable.replaceChildren();
    whereTable.replaceChildren();
    internalTable.replaceChildren();
    externalTable.replaceChildren();
    planList.replaceChildren();
    source.replaceChildren();
    sqlChart.replaceChildren();
    pcChart.replaceChildren();
    closeOccurrences?.();
    closeOccurrences = null;
    doc.getElementById("mpu-tracesql-dialog")?.remove();
  };

  const invalidate = () => {
    abort?.abort();
    abort = null;
    revision++;
    report.value = "";
    reviewed.checked = false;
    reviewed.disabled = true;
    copy.disabled = download.disabled = copySql.disabled = downloadSql.disabled = true;
    preview.disabled = false;
    cancel.disabled = true;
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
    const ready = reviewed.checked && !!report.value;
    copy.disabled = download.disabled = !ready;
    copySql.disabled = downloadSql.disabled = !ready || !sqlOnly;
  });
  cancel.addEventListener("click", () => {
    abort?.abort();
    abort = null;
    revision++;
    preview.disabled = false;
    cancel.disabled = true;
    hideGrouping();
    report.value = "";
    reviewed.checked = false;
    reviewed.disabled = true;
    copy.disabled = download.disabled = copySql.disabled = downloadSql.disabled = true;
    status.textContent = "Preview cancelled. No partial report is available. Select a file or paste, then Preview.";
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
    cancel.disabled = false;
    abort = new AbortController();
    const signal = abort.signal;
    status.textContent = selected.length ? "Reading selected excerpt(s) locally…" : "Preparing pasted excerpt locally…";
    void (async () => {
      const texts = selected.length
        ? await Promise.all(selected.map((file) => file.arrayBuffer().then((buffer) => new TextDecoder("utf-8", { fatal: true }).decode(buffer))))
        : [pasted];
      if (generation !== revision || !root.isConnected || signal.aborted) return;
      if (texts.some((text) => !text.trim())) {
        status.textContent = "Excerpt is empty. Provide sanitized tracesql text, then Preview again.";
        return;
      }
      const reports: TraceSqlReport[] = [];
      for (const [index, text] of texts.entries()) {
        reports.push(
          await parseTraceSqlAsync(text, {
            signal,
            onProgress: (line, total) => {
              if (generation === revision) status.textContent = `Parsing excerpt ${index + 1} of ${texts.length}: line ${line} of ${total}…`;
            },
          }),
        );
      }
      if (generation !== revision || !root.isConnected || signal.aborted) return;
      report.value = renderTraceSqlInvestigations(texts);
      parsed = reports[0];
      sqlOnly = renderTraceSqlSqlOnly(parsed);
      sourceLines = texts[0].replace(/^\ufeff/, "").split(/\r\n|\r|\n/);
      renderSource(sourceLines);
      renderGrouping(parsed, sqlid.value);
      grouping.hidden = false;
      reviewed.disabled = false;
      report.focus();
      status.textContent =
        "Preview ready. Filter FROM/WHERE by SQLID, open occurrences, or highlight a plan row, then check the review box to copy the report or SQL-only export.";
    })()
      .catch((error: unknown) => {
        if (generation !== revision || !root.isConnected) return;
        hideGrouping();
        status.textContent =
          error instanceof DOMException && error.name === "AbortError"
            ? "Preview cancelled. No partial report is available. Select a file or paste, then Preview."
            : "Cannot prepare this investigation. Check UTF-8 text, nonempty excerpt, line/file limits and report size. No partial report is available.";
      })
      .finally(() => {
        if (generation === revision) {
          preview.disabled = false;
          cancel.disabled = true;
        }
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

  const exportSql = (copied: boolean) => {
    if (!reviewed.checked || !sqlOnly) return;
    if (copied) {
      const generation = revision;
      void Promise.resolve()
        .then(() => navigator.clipboard.writeText(sqlOnly))
        .then(() => {
          if (generation === revision) status.textContent = "Reviewed SQL statements copied (no stats).";
        })
        .catch(() => {
          if (generation === revision) status.textContent = "Copy unavailable. Download the SQL-only file instead.";
        });
      return;
    }
    const url = URL.createObjectURL(new Blob([sqlOnly], { type: "text/plain;charset=utf-8" }));
    const link = make("a");
    link.href = url;
    link.download = "mpu-tracesql-statements.sql.txt";
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = "Reviewed SQL statements downloaded (no stats).";
  };
  copySql.addEventListener("click", () => exportSql(true));
  downloadSql.addEventListener("click", () => exportSql(false));
}
