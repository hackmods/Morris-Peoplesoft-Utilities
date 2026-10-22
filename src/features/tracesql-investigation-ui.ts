import { TRACESQL_FORMAT, TRACESQL_LIMITS, renderTraceSqlInvestigation } from "./tracesql-investigation";

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
    "Select one sanitized PeopleSoft .tracesql or .trc excerpt, or paste sanitized text, then preview a hotspot report in this browser tab. Evidence stays in tab memory until cleared or reloaded. Nothing is saved in extension storage or sent over the network.",
  );
  const scope = make(
    "p",
    `Supported parser: ${TRACESQL_FORMAT}. UTF-8 plain text only: one file or paste, at most ${TRACESQL_LIMITS.maxBytes.toLocaleString()} bytes, ${TRACESQL_LIMITS.maxLines.toLocaleString()} lines, ${TRACESQL_LIMITS.maxLineChars.toLocaleString()} characters per line. Recognizes Trace Magic-style markers (COM STMT=SELECT/INSERT/UPDATE/DELETE, Dur=, Bind-, >>> start / <<< end, call). SELECT without PS_/PS tables is ignored. Synthetic samples do not verify real-log compatibility.`,
  );
  const privacy = make(
    "p",
    "Sanitize binds and PII before selecting a file or pasting. Report cells use JSON string escaping; review every unmasked SQL string before copy or download. Filenames are omitted from the report.",
  );
  const files = make("input");
  files.type = "file";
  files.accept = ".tracesql,.trc,.txt,.log,text/plain";
  const paste = make("textarea");
  paste.rows = 8;
  paste.placeholder = "Optional: paste a sanitized tracesql excerpt when you cannot attach a file";
  paste.setAttribute("spellcheck", "false");
  const status = make("p");
  status.id = "mpu-tracesql-status";
  status.setAttribute("aria-live", "polite");
  status.textContent = "Select a sanitized .tracesql / .trc file or paste an excerpt, then Preview.";
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

  root.replaceChildren(
    heading,
    intro,
    scope,
    privacy,
    field("Sanitized tracesql / trc excerpt", files, "mpu-tracesql-files"),
    field("Sanitized tracesql paste (optional if no file)", paste, "mpu-tracesql-paste"),
    status,
    preview,
    clear,
    field("Trace SQL investigation report", report, "mpu-tracesql-report"),
    field("I reviewed this Trace SQL report for sensitive information and scope", reviewed, "mpu-tracesql-reviewed"),
    copy,
    download,
  );

  let revision = 0;
  const invalidate = () => {
    revision++;
    report.value = "";
    reviewed.checked = false;
    reviewed.disabled = true;
    copy.disabled = download.disabled = true;
    preview.disabled = false;
  };
  const reset = () => {
    invalidate();
    files.value = "";
    paste.value = "";
    status.textContent = "Trace SQL evidence and report cleared from this tab. Select a file or paste an excerpt to continue.";
  };

  files.addEventListener("change", () => {
    invalidate();
    const selected = files.files?.[0];
    status.textContent = selected
      ? `Selected ${selected.name} (${selected.size.toLocaleString()} bytes). File wins over paste. Prepare a fresh preview.`
      : "File selection cleared. Paste an excerpt or choose a file, then Preview.";
  });
  paste.addEventListener("input", () => {
    invalidate();
    status.textContent = files.files?.length
      ? "Paste changed; the selected file still wins on Preview. Prepare a fresh preview."
      : "Paste changed. Prepare a fresh preview.";
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
    if (selected.length > 1) {
      status.textContent = "Select at most one sanitized tracesql or trc excerpt.";
      return;
    }
    if (!selected.length && !pasted.trim()) {
      status.textContent = "Select one sanitized tracesql or trc excerpt, or paste sanitized text.";
      return;
    }
    if (selected.length === 1 && selected[0].size > TRACESQL_LIMITS.maxBytes) {
      status.textContent = "File exceeds the size limit above. Use a smaller excerpt.";
      return;
    }
    if (!selected.length && new TextEncoder().encode(pasted).length > TRACESQL_LIMITS.maxBytes) {
      status.textContent = "Paste exceeds the size limit above. Use a smaller excerpt.";
      return;
    }
    preview.disabled = true;
    status.textContent = selected.length ? "Reading selected excerpt locally…" : "Preparing pasted excerpt locally…";
    void (async () => {
      const text = selected.length
        ? await selected[0].arrayBuffer().then((buffer) => new TextDecoder("utf-8", { fatal: true }).decode(buffer))
        : pasted;
      if (generation !== revision || !root.isConnected) return;
      if (!text.trim()) {
        status.textContent = "Excerpt is empty. Provide sanitized tracesql text, then Preview again.";
        return;
      }
      report.value = renderTraceSqlInvestigation(text);
      reviewed.disabled = false;
      report.focus();
      status.textContent =
        "Preview ready. Review all unmasked SQL and error lines, then check the review box to enable copy or download.";
    })()
      .catch(() => {
        if (generation !== revision || !root.isConnected) return;
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
        if (generation === revision) status.textContent = "Reviewed Trace SQL report copied.";
      })
      .catch(() => {
        if (generation === revision) {
          report.focus();
          report.select();
          status.textContent = "Copy unavailable. Select and copy the reviewed report manually.";
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
    status.textContent = "Reviewed Trace SQL report downloaded.";
  });
}
