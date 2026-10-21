import {
  exportRunbooks, findRunbookConflicts, loadRunbookStore, parseRunbookImport, requestRunbookMutation,
  RUNBOOK_LINK_LIMIT, RUNBOOK_TEXT_LIMIT, type EnvironmentRunbook, type RunbookStore,
} from "../storage/runbooks";

function make<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function safeLink(doc: Document, url: string, label: string): HTMLAnchorElement {
  const anchor = make(doc, "a", label); anchor.href = url; anchor.target = "_blank";
  anchor.rel = "noopener noreferrer"; anchor.referrerPolicy = "no-referrer";
  return anchor;
}

function appendRunbookPreview(doc: Document, host: HTMLElement, runbook: EnvironmentRunbook): void {
  const card = make(doc, "li");
  card.append(make(doc, "h4", runbook.title));
  card.append(make(doc, "p", "Environment label: " + runbook.environment));
  card.append(make(doc, "p", "Component: " + runbook.component));
  const notes = make(doc, "pre", runbook.notes); notes.setAttribute("aria-label", "Runbook notes");
  card.append(notes);
  if (runbook.links.length) {
    const links = make(doc, "ul");
    for (const link of runbook.links) links.appendChild(make(doc, "li", link.label + ": " + link.url));
    card.append(links);
  }
  host.appendChild(card);
}

/** Local environment/component runbooks. No page context is read or sent anywhere. */
export function bindRunbooksUI(doc: Document, container: HTMLElement, environmentLabels: string[]): () => void {
  let store: RunbookStore = { revision: 0, runbooks: [] };
  let selectedId = "";
  let live = true;
  let saving = false;
  let importing = false;
  let exportArmed = false;
  let previewRevision: number | null = null;
  let previewRunbooks: EnvironmentRunbook[] = [];
  container.classList.add("mpu-runbooks");
  const heading = make(doc, "h2", "Environment runbooks");
  const intro = make(doc, "p", "Private local notes for a selected environment and component. Links open only when you choose them; no page details are attached.");
  const status = make(doc, "p"); status.setAttribute("aria-live", "polite");
  const list = make(doc, "ul");
  const editor = make(doc, "section"); editor.setAttribute("aria-label", "Runbook editor");
  const importHeading = make(doc, "h3", "Team import and export");
  const importWarning = make(doc, "p", "Runbook exports may contain business context in local notes. Review the contents before sharing an export.");
  const importText = make(doc, "textarea"); importText.rows = 5; importText.maxLength = 256000; importText.setAttribute("aria-label", "Runbook JSON to import");
  importText.autocomplete = "off"; importText.spellcheck = false;
  const preview = make(doc, "section"); preview.setAttribute("aria-label", "Runbook import preview");
  const actions = make(doc, "div");
  const createButton = make(doc, "button", "New runbook"); createButton.type = "button";
  const reloadButton = make(doc, "button", "Reload runbooks"); reloadButton.type = "button";
  const exportButton = make(doc, "button", "Export runbooks"); exportButton.type = "button";
  const previewButton = make(doc, "button", "Preview import"); previewButton.type = "button";
  actions.append(createButton, reloadButton, exportButton);
  container.replaceChildren(heading, intro, status, actions, list, editor, importHeading, importWarning, importText, previewButton, preview);

  const setStatus = (text: string) => { if (live) status.textContent = text; };
  const clearPreview = () => {
    previewRevision = null; previewRunbooks = []; preview.replaceChildren();
  };
  const refresh = async (discardDraft: boolean) => {
    try {
      const next = await loadRunbookStore();
      if (!live) return;
      store = next;
      if (discardDraft && !store.runbooks.some((item) => item.id === selectedId)) selectedId = "";
      clearPreview();
      exportArmed = false;
      reloadButton.textContent = "Reload runbooks";
      setStatus(discardDraft ? "Latest runbooks loaded. Unsaved edits were discarded." : "Runbooks loaded.");
      render();
    } catch { setStatus("Runbooks could not be loaded. Your current draft is still here."); }
  };
  const appendField = (labelText: string, control: HTMLElement, focusKey?: string) => {
    const label = make(doc, "label", labelText); label.appendChild(control); editor.appendChild(label);
    if (focusKey) control.dataset.runbookFocus = focusKey;
    return control;
  };
  const render = (focusKey?: string) => {
    list.replaceChildren(...store.runbooks.map((item) => {
      const row = make(doc, "li");
      const pick = make(doc, "button", item.title + " — " + item.environment + " / " + item.component); pick.type = "button";
      pick.dataset.runbookFocus = "item:" + item.id;
      pick.setAttribute("aria-pressed", String(item.id === selectedId));
      pick.addEventListener("click", () => { if (saving || importing) return; selectedId = item.id; render("item:" + item.id); });
      row.appendChild(pick); return row;
    }));
    editor.replaceChildren();
    const current = store.runbooks.find((item) => item.id === selectedId);
    const environment = make(doc, "select"); environment.setAttribute("aria-label", "Environment");
    for (const name of environmentLabels) { const option = make(doc, "option", name); option.value = name; environment.appendChild(option); }
    if (current && !environmentLabels.includes(current.environment)) { const option = make(doc, "option", current.environment); option.value = current.environment; environment.appendChild(option); }
    if (current) environment.value = current.environment;
    else if (environmentLabels.length) environment.value = environmentLabels[0];
    appendField("Environment", environment, "editor-environment");
    const component = make(doc, "input"); component.maxLength = 160; component.value = current?.component || ""; component.autocomplete = "off";
    appendField("Component (for example, MENU.COMPONENT)", component, "editor-component");
    const title = make(doc, "input"); title.maxLength = 160; title.value = current?.title || ""; title.autocomplete = "off";
    appendField("Runbook title", title, "editor-title");
    const notes = make(doc, "textarea"); notes.rows = 6; notes.maxLength = RUNBOOK_TEXT_LIMIT; notes.value = current?.notes || "";
    appendField("Notes (up to " + RUNBOOK_TEXT_LIMIT + " characters)", notes, "editor-notes");
    const links = make(doc, "textarea"); links.rows = 4; links.maxLength = RUNBOOK_LINK_LIMIT * 2200; links.value = current?.links.map((item) => item.label + " | " + item.url).join("\n") || "";
    links.setAttribute("aria-label", "Approved HTTPS links, one per line as label | URL, maximum " + RUNBOOK_LINK_LIMIT);
    appendField("Approved HTTPS links (one per line: label | URL)", links, "editor-links");
    const save = make(doc, "button", current ? "Save changes" : "Save runbook"); save.type = "button"; save.dataset.runbookFocus = "save";
    const remove = make(doc, "button", "Delete runbook"); remove.type = "button"; remove.dataset.runbookFocus = "delete"; remove.disabled = !current;
    editor.append(save, remove);
    const linkList = make(doc, "ul");
    if (current) for (const link of current.links) { const li = make(doc, "li"); li.appendChild(safeLink(doc, link.url, link.label)); linkList.appendChild(li); }
    editor.appendChild(linkList);
    save.addEventListener("click", () => {
      if (saving || importing) return;
      try {
        const parsedLinks = links.value.trim() ? links.value.split(/\r?\n/).map((line) => {
          const divider = line.indexOf("|");
          if (divider < 1) throw new Error("Each link needs a label, a vertical bar, and an HTTPS URL.");
          return { label: line.slice(0, divider).trim(), url: line.slice(divider + 1).trim() };
        }) : [];
        if (parsedLinks.length > RUNBOOK_LINK_LIMIT) throw new Error("A maximum of " + RUNBOOK_LINK_LIMIT + " links is allowed.");
        const runbook: EnvironmentRunbook = {
          id: current?.id || "rb-" + globalThis.crypto.randomUUID(),
          environment: environment.value, component: component.value, title: title.value, notes: notes.value,
          links: parsedLinks, updatedAt: Date.now(),
        };
        saving = true; save.disabled = true;
        void requestRunbookMutation({ type: "mpu-environment-runbooks", action: "save", baseRevision: store.revision, runbook })
          .then((next) => {
            saving = false; store = next; selectedId = runbook.id; exportArmed = false;
            setStatus("Runbook saved on this device."); render("item:" + runbook.id);
          })
          .catch((error: unknown) => {
            saving = false; save.disabled = false;
            setStatus(error instanceof Error ? error.message : "Runbook could not be saved.");
            if (error instanceof Error && error.message.includes("changed in another view")) reloadButton.textContent = "Reload runbooks (discard unsaved edits)";
          });
      } catch (error) { setStatus(error instanceof Error ? error.message : "Runbook could not be saved."); }
    });
    remove.addEventListener("click", () => {
      if (!current || saving || importing) return;
      saving = true; remove.disabled = true;
      void requestRunbookMutation({ type: "mpu-environment-runbooks", action: "delete", baseRevision: store.revision, id: current.id })
        .then((next) => { saving = false; store = next; selectedId = ""; setStatus("Runbook deleted."); render("editor-title"); })
        .catch((error: unknown) => {
          saving = false; remove.disabled = false;
          setStatus(error instanceof Error ? error.message : "Runbook could not be deleted.");
          if (error instanceof Error && error.message.includes("changed in another view")) reloadButton.textContent = "Reload runbooks (discard unsaved edits)";
        });
    });
    if (focusKey) Array.from(container.querySelectorAll<HTMLElement>("[data-runbook-focus]")).find((item) => item.dataset.runbookFocus === focusKey)?.focus();
  };

  createButton.addEventListener("click", () => { if (saving || importing) return; selectedId = ""; render("editor-title"); });
  reloadButton.addEventListener("click", () => { if (!saving && !importing) void refresh(true); });
  exportButton.addEventListener("click", () => {
    if (!exportArmed) {
      exportArmed = true;
      setStatus("Export includes environment notes and links. Review them before sharing, then select Export runbooks again to download.");
      return;
    }
    try {
      const blob = new Blob([JSON.stringify(exportRunbooks(store.runbooks))], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = make(doc, "a", "Download runbook export"); anchor.href = url; anchor.download = "mpu-runbooks.json"; anchor.click();
      URL.revokeObjectURL(url); exportArmed = false; setStatus("Runbook export prepared.");
    } catch (error) { exportArmed = false; setStatus(error instanceof Error ? error.message : "Runbook export could not be created."); }
  });
  previewButton.addEventListener("click", () => {
    if (saving || importing) return;
    clearPreview();
    try {
      const imported = parseRunbookImport(importText.value);
      const collisions = findRunbookConflicts(imported, store.runbooks);
      if (collisions.length) {
        setStatus("Import rejected: IDs already exist (" + collisions.join(", ") + ").");
        return;
      }
      previewRevision = store.revision;
      previewRunbooks = imported;
      const unknownLabels = [...new Set(imported.map((item) => item.environment).filter((label) => !environmentLabels.includes(label)))];
      if (unknownLabels.length) preview.appendChild(make(doc, "p", "These environment labels are not in this device’s settings and will be kept as labels only; no environment mapping is created: " + unknownLabels.join(", ")));
      const details = make(doc, "ul");
      for (const item of imported) appendRunbookPreview(doc, details, item);
      preview.appendChild(details);
      setStatus("Preview shows all imported runbook content. Review it before importing.");
      if (imported.length) {
        const confirm = make(doc, "button", "Import reviewed runbooks"); confirm.type = "button"; confirm.dataset.runbookFocus = "import";
        confirm.addEventListener("click", () => {
          if (saving || importing || previewRevision === null) return;
          importing = true; confirm.disabled = true;
          void requestRunbookMutation({ type: "mpu-environment-runbooks", action: "import", baseRevision: previewRevision, runbooks: previewRunbooks })
            .then((next) => { const importedCount = previewRunbooks.length; importing = false; store = next; selectedId = ""; importText.value = ""; clearPreview(); setStatus(importedCount + " runbook(s) imported."); render(); previewButton.focus(); })
            .catch((error: unknown) => {
              importing = false; confirm.disabled = false;
              setStatus(error instanceof Error ? error.message : "Runbook import could not be saved.");
              if (error instanceof Error && error.message.includes("changed in another view")) reloadButton.textContent = "Reload runbooks (discard unsaved edits)";
            });
        });
        preview.appendChild(confirm);
      }
    } catch (error) {
      clearPreview();
      setStatus(error instanceof Error ? error.message : "Runbook import could not be previewed.");
    }
  });
  importText.addEventListener("input", clearPreview);
  void refresh(false);
  doc.defaultView?.addEventListener("pagehide", () => { live = false; }, { once: true });
  return () => { live = false; };
}
