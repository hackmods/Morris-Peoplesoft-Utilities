import { IB_CHECKS, IB_DISPOSITIONS, IB_ENUMS, IB_LIMITS, IB_V2_FIELDS, ibRecordChoices, parseIbEvidence, type IbReportOptions } from "./ib-investigation";

/** Drafts and manual assertions are session-only, separate from imported files. */
export function bindIbCaseUI(doc: Document, root: HTMLElement, changed: (sourcesChanged?: boolean) => void) {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => { const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const field = (labelText: string, control: HTMLElement, id: string) => {
    const row = make("div"); const label = make("label", labelText); label.htmlFor = id; control.id = id; row.append(label, control); return row;
  };
  const select = (values: readonly string[]) => { const node = make("select"); values.forEach(value => { const option = make("option", value); option.value = value; node.append(option); }); return node; };
  const button = (label: string, id: string) => { const node = make("button", label); node.id = id; node.type = "button"; return node; };
  const details = (title: string) => { const node = make("details"); node.append(make("summary", title)); root.append(node); return node; };
  const builder = details("Prepare evidence records without writing JSON");
  builder.append(make("p", "Enter manually verified context and paste or explicitly read a sanitized payload file. Add record appends to a local draft; it never overwrites imported files. Drafts become Source 1 when Preview is requested. JSON citations then refer to generated draft text. Form edits require a fresh report; only added records enter it."));
  const grid = make("div"); grid.className = "mpu-ib-builder-grid"; builder.append(grid);
  const entryControls = new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>();
  let generation = 0; let loading = false;
  const touch = (sourcesChanged = false) => { generation++; if (loading) { loading = false; status.textContent = "Payload read cancelled after an edit. Read the file again if needed."; } changed(sourcesChanged); };
  for (const name of IB_V2_FIELDS.filter(name => !["payload", "payloadXml"].includes(name))) {
    const control = IB_ENUMS[name] ? select(["unknown", ...IB_ENUMS[name].filter(value => value !== "unknown")]) : ["error", "evidenceNote"].includes(name) ? make("textarea") : make("input");
    if (control.tagName !== "SELECT") (control as HTMLInputElement | HTMLTextAreaElement).maxLength = ["error", "evidenceNote"].includes(name) ? 4_000 : 200;
    if (name === "observedAt") (control as HTMLInputElement).placeholder = "2026-10-21T10:00:00-04:00";
    entryControls.set(name, control); grid.append(field(name, control, `mpu-ib-entry-${name}`));
    control.addEventListener(control.tagName === "SELECT" ? "change" : "input", () => touch());
  }
  const format = select(["none", "json", "xml"]); const payload = make("textarea"); payload.rows = 7; payload.maxLength = IB_LIMITS.maxBytes;
  builder.append(field("Draft payload format", format, "mpu-ib-entry-format"), field("Sanitized draft payload (JSON object/array or XML/SOAP excerpt)", payload, "mpu-ib-entry-payload"));
  const file = make("input"); file.type = "file"; file.accept = ".json,.xml,.txt,application/json,application/xml,text/xml,text/plain";
  const load = button("Read selected payload into form", "mpu-ib-load-payload");
  builder.append(field("Optional sanitized payload file", file, "mpu-ib-payload-file"), load,
    make("p", "Payload file reads require this button; format is selected explicitly. XML subset: at most 4,000 characters; no DTDs, custom entities or processing instructions. JSON retains exact numeric text when added. A draft shares the four-source / 256,000-byte / 50-record / 2,000-entry limits."));
  const add = button("Add evidence record to draft", "mpu-ib-add-record"); const list = make("ul"); list.id = "mpu-ib-draft-records";
  const status = make("p"); status.id = "mpu-ib-draft-status"; status.setAttribute("aria-live", "polite"); builder.append(add, status, list);
  const drafts: string[] = [];
  const draftSource = () => drafts.length ? `{\n  "format": "mpu-ib-evidence",\n  "version": 2,\n  "records": [\n${drafts.map(record => `    ${record}`).join(",\n")}\n  ]\n}` : null;
  const renderDrafts = () => {
    list.replaceChildren();
    drafts.forEach((_, index) => {
      const li = make("li", `Draft record ${index + 1} `); const remove = button(`Remove draft record ${index + 1}`, `mpu-ib-remove-${index}`);
      remove.addEventListener("click", () => { drafts.splice(index, 1); touch(true); renderDrafts(); status.textContent = `${drafts.length} draft record(s) retained.`; (list.querySelectorAll("button")[Math.min(index, drafts.length - 1)] ?? add).focus(); });
      li.append(remove); list.append(li);
    });
  };
  format.addEventListener("change", () => touch()); payload.addEventListener("input", () => touch()); file.addEventListener("change", () => touch());
  load.addEventListener("click", () => {
    const selected = file.files?.[0]; if (!selected || selected.size > IB_LIMITS.maxBytes) { status.textContent = "Select one UTF-8 payload file of at most 256,000 bytes."; return; }
    const revision = ++generation; loading = true; status.textContent = "Reading payload locally…";
    void selected.arrayBuffer().then(buffer => new TextDecoder("utf-8", { fatal: true }).decode(buffer)).then(text => {
      if (revision !== generation || !root.isConnected) return;
      payload.value = text; loading = false; touch(); status.textContent = "Payload loaded into form. Select its format, review metadata and explicitly add the record.";
    }).catch(() => { if (revision === generation && root.isConnected) { loading = false; status.textContent = "Cannot read this payload. Check UTF-8 encoding and limits; content and filename are not shown in errors."; } });
  });
  add.addEventListener("click", () => {
    const pairs = Array.from(entryControls).flatMap(([name, control]) => control.value && control.value !== "unknown" ? [`${JSON.stringify(name)}:${JSON.stringify(control.value)}`] : []);
    if (format.value !== "none") pairs.push(format.value === "xml" ? `"payloadXml":${JSON.stringify(payload.value)}` : `"payload":${payload.value}`);
    else if (payload.value.trim()) { status.textContent = "Select the payload format before adding; entered payload text will not be silently discarded."; return; }
    if (!pairs.length) { status.textContent = "Enter observed metadata, an evidence note or a payload before adding a record."; return; }
    const record = `{${pairs.join(",")}}`; drafts.push(record);
    try { parseIbEvidence(draftSource()!); }
    catch { drafts.pop(); status.textContent = "Cannot add this record. Check metadata, JSON/XML syntax, duplicate keys and the stated draft limits. No partial record was added."; return; }
    touch(true); renderDrafts(); status.textContent = `${drafts.length} record(s) added to the local draft. Preview includes this draft as Source 1. Form values are retained.`;
  });
  const comparison = details("Compare two explicitly selected records"); comparison.append(make("p", "Prepare a first preview to load record choices, then select two different records and preview again. Nothing is selected or joined by matching IDs. A file/draft change clears the choices. Payload comparison also requires payload inclusion; masked payloads are never compared."));
  const left = make("select"); const right = make("select");
  comparison.append(field("First evidence record", left, "mpu-ib-compare-left"), field("Second evidence record", right, "mpu-ib-compare-right"));
  const emptyChoices = () => { for (const node of [left, right]) { node.replaceChildren(); const option = make("option", "No record selected"); option.value = ""; node.append(option); } };
  emptyChoices(); left.addEventListener("change", () => touch()); right.addEventListener("change", () => touch());
  const caseReview = details("Case findings and follow-up"); caseReview.append(make("p", "These are manual assertions, not verified outcomes. Notes remain in this tab and enter the next reviewed report. Use source/record/line references in notes; no action is taken on a server."));
  const caseControls = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
  for (const [name, label] of [["caseLabel", "Case label"], ["owner", "Follow-up owner"], ["expected", "Expected result"], ["actual", "Observed result / current hypothesis"]]) {
    const control = ["expected", "actual"].includes(name) ? make("textarea") : make("input"); control.maxLength = ["expected", "actual"].includes(name) ? 2_000 : 200;
    caseControls.set(name, control); caseReview.append(field(label, control, `mpu-ib-case-${name}`)); control.addEventListener("input", () => touch());
  }
  const checks = new Map<string, { disposition: HTMLSelectElement; note: HTMLTextAreaElement }>();
  for (const [id, text] of IB_CHECKS) {
    const group = make("fieldset"); group.append(make("legend", text)); const disposition = select(IB_DISPOSITIONS); const note = make("textarea"); note.maxLength = 1_000;
    group.append(field(`${id} review disposition`, disposition, `mpu-ib-check-${id}`), field(`${id} evidence / follow-up note`, note, `mpu-ib-note-${id}`)); caseReview.append(group); checks.set(id, { disposition, note });
    disposition.addEventListener("change", () => touch()); note.addEventListener("input", () => touch());
  }
  return {
    draftSource,
    clearChoices: emptyChoices,
    setSources(inputs: string[]) {
      const values = [left.value, right.value]; const choices = ibRecordChoices(inputs); emptyChoices();
      for (const node of [left, right]) for (const choice of choices) { const option = make("option", choice.label); option.value = choice.value; node.append(option); }
      [left, right].forEach((node, index) => { if (choices.some(choice => choice.value === values[index])) node.value = values[index]; });
    },
    options(): IbReportOptions {
      if ((left.value || right.value) && (!left.value || !right.value || left.value === right.value)) throw new Error("Select two different evidence records.");
      return { comparison: left.value && right.value ? { left: left.value, right: right.value } : undefined, draftFirst: drafts.length > 0,
        review: { ...Object.fromEntries(Array.from(caseControls, ([key, node]) => [key, node.value])), checks: Object.fromEntries(Array.from(checks, ([key, nodes]) => [key, { disposition: nodes.disposition.value, note: nodes.note.value }])) } };
    },
    clear() {
      generation++; loading = false; drafts.length = 0; renderDrafts(); emptyChoices(); status.textContent = "";
      entryControls.forEach(control => { control.value = control.tagName === "SELECT" ? "unknown" : ""; });
      payload.value = ""; file.value = ""; format.value = "none"; caseControls.forEach(control => { control.value = ""; });
      checks.forEach(nodes => { nodes.disposition.value = "unreviewed"; nodes.note.value = ""; });
    },
  };
}
