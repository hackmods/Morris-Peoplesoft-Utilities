import { SCHEDULER_FORMAT, SCHEDULER_LIMITS, parseSchedulerExcerpt, renderSchedulerInvestigation } from "./scheduler-investigation";
import { SCHEDULER_CASE_FIELDS, schedulerFocusChoices, type SchedulerCase } from "./scheduler-case";

/** Session memory only. Selection never triggers a read, capture or network call. */
export function bindSchedulerInvestigationUI(doc: Document, root: HTMLElement): void {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; return node;
  };
  const field = (text: string, control: HTMLElement, id: string) => {
    const label = make("label", text); control.id = id; label.htmlFor = id;
    const row = make("div"); row.append(label, control); return row;
  };
  const button = (text: string, id: string) => { const node = make("button", text); node.type = "button"; node.id = id; return node; };
  root.classList.add("mpu-comparison", "mpu-scheduler");
  const heading = make("h2", "Process Scheduler investigation");
  const intro = make("p", "Select sanitized log excerpts, optionally paste the existing Process Monitor ticket pack, then preview a combined report. Files and pasted evidence stay in this tab's memory until cleared or reloaded. Nothing is saved in extension storage or sent over the network. No server access or automatic page capture.");
  const scope = make("p", `Supported parser: ${SCHEDULER_FORMAT}. UTF-8 plain text only: at most 4 files, 256,000 bytes and 2,000 physical lines per file, 4,000 characters per line. A timestamp must start a line, use YYYY-MM-DDTHH:mm:ss with optional milliseconds and Z or ±HH:MM. Exact semicolon-delimited Process Instance: 123 and Parent Process Instance: 100 labels provide reported relationship evidence. Native/localized log formats, numeric status codes and other IDs are not interpreted. Unsupported dates and unlabeled lines remain visible with unknown time/instance. Synthetic samples do not verify real-log compatibility.`);
  const privacy = make("p", "Sanitize sources first. Conservative masking cannot detect every secret or business identifier. Sensitive records and their continuations are omitted until the next supported timestamp; private-key blocks stay masked through their end. File names are omitted from the report. Confirm all excerpts refer to the intended environment and capture window; matching numbers or adjacent times do not prove dependencies, completion or a cause.");
  const files = make("input"); files.type = "file"; files.multiple = true; files.accept = ".txt,.log,.out,text/plain";
  const pack = make("textarea"); pack.rows = 6; pack.maxLength = SCHEDULER_LIMITS.maxPackChars;
  const caseForm = make("details"); const summary = make("summary", "Case scope, findings and follow-up (manual)");
  caseForm.append(summary, make("p", "All fields are optional manual assertions. Run status and distribution evidence are separate. Notes stay in this tab only; changing sources retains notes, so recheck every citation and scope before sharing."));
  const caseInputs = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
  for (const spec of SCHEDULER_CASE_FIELDS) {
    const control = spec.maxLength > 200 ? make("textarea") : make("input"); control.maxLength = spec.maxLength; control.autocomplete = "off";
    if (control.tagName === "TEXTAREA") (control as HTMLTextAreaElement).rows = 3;
    caseInputs.set(spec.key, control); caseForm.append(field(`${spec.label} (manual, up to ${spec.maxLength} characters)`, control, `mpu-scheduler-case-${spec.key}`));
  }
  const refs = make("input"); refs.maxLength = 500; refs.autocomplete = "off";
  caseForm.append(field("Evidence references (optional, comma-separated Source 1:L1)", refs, "mpu-scheduler-case-refs"));
  const focus = make("select"); const resetFocus = () => { const option = make("option", "No process focus selected"); option.value = ""; focus.replaceChildren(option); focus.disabled = true; };
  resetFocus();
  const status = make("p"); status.id = "mpu-scheduler-status"; status.setAttribute("aria-live", "polite");
  const preview = button("Preview Scheduler investigation", "mpu-scheduler-preview");
  const clear = button("Clear Scheduler evidence and report", "mpu-scheduler-clear");
  const report = make("textarea"); report.rows = 20; report.readOnly = true;
  const reviewed = make("input"); reviewed.type = "checkbox"; reviewed.disabled = true;
  const copy = button("Copy reviewed Scheduler report", "mpu-scheduler-copy"); copy.disabled = true;
  const download = button("Download reviewed Scheduler report", "mpu-scheduler-download"); download.disabled = true;
  root.replaceChildren(heading, intro, scope, privacy, field("Sanitized Scheduler log excerpts", files, "mpu-scheduler-files"),
    field("Sanitized Process Monitor ticket pack (optional, up to 4,000 characters)", pack, "mpu-scheduler-pack"), status, preview, clear,
    caseForm, field("Process focus (choices load after Preview; source labels only)", focus, "mpu-scheduler-focus"),
    field("Scheduler investigation report", report, "mpu-scheduler-report"), field("I reviewed this Scheduler report for sensitive information and scope", reviewed, "mpu-scheduler-reviewed"), copy, download);
  let revision = 0;
  const invalidate = () => {
    revision++; report.value = ""; reviewed.checked = false; reviewed.disabled = true;
    copy.disabled = download.disabled = true; preview.disabled = false;
  };
  const reset = () => { invalidate(); files.value = ""; pack.value = ""; refs.value = ""; caseInputs.forEach(control => { control.value = ""; }); resetFocus(); status.textContent = "Scheduler evidence and report cleared from this tab."; };
  files.addEventListener("change", () => { invalidate(); resetFocus(); status.textContent = "File selection changed. Notes were retained; recheck their scope and references, then prepare a fresh preview."; });
  pack.addEventListener("input", () => { invalidate(); status.textContent = "Ticket evidence changed. Prepare a fresh preview."; });
  const caseChanged = () => { invalidate(); status.textContent = "Case scope or findings changed. Prepare and review a fresh preview."; };
  caseInputs.forEach(control => control.addEventListener("input", caseChanged)); refs.addEventListener("input", caseChanged); focus.addEventListener("change", caseChanged);
  clear.addEventListener("click", reset); doc.defaultView?.addEventListener("pagehide", reset);
  reviewed.addEventListener("change", () => { copy.disabled = download.disabled = !reviewed.checked || !report.value; });
  preview.addEventListener("click", () => {
    invalidate(); const generation = revision; const selected = Array.from(files.files ?? []); const ticket = pack.value;
    if (!selected.length || selected.length > SCHEDULER_LIMITS.maxFiles) { status.textContent = "Select between 1 and 4 sanitized log excerpts explicitly."; return; }
    if (selected.some(file => file.size > SCHEDULER_LIMITS.maxBytes) || ticket.length > SCHEDULER_LIMITS.maxPackChars) { status.textContent = "Evidence exceeds the file or ticket limits above. Use smaller excerpts."; return; }
    preview.disabled = true; status.textContent = "Reading selected excerpts locally…";
    void (async () => {
      const texts = await Promise.all(selected.map(file => file.arrayBuffer().then(buffer => new TextDecoder("utf-8", { fatal: true }).decode(buffer))));
      if (generation !== revision || !root.isConnected) return;
      const selectedFocus = focus.value;
      const caseData: SchedulerCase = Object.fromEntries([...caseInputs].map(([key, control]) => [key, control.value]));
      caseData.evidenceRefs = refs.value; caseData.focus = selectedFocus;
      const nextReport = renderSchedulerInvestigation(texts, ticket, caseData);
      const choices = schedulerFocusChoices(texts.map(parseSchedulerExcerpt)); resetFocus();
      for (const choice of choices) { const option = make("option", choice.label); option.value = choice.value; focus.append(option); }
      focus.disabled = !choices.length; focus.value = selectedFocus;
      report.value = nextReport; reviewed.disabled = false; report.focus();
      status.textContent = "Preview ready. Unknown evidence is labelled; masked records were not interpreted. Review scope and all unmasked content before export.";
    })().catch(() => {
      if (generation !== revision || !root.isConnected) return;
      status.textContent = "Cannot prepare this investigation. Check UTF-8 text, nonempty excerpts, line/file/case limits, exact Source N:Lm references and report size. No partial report is available.";
    }).finally(() => { if (generation === revision) preview.disabled = false; });
  });
  copy.addEventListener("click", () => {
    if (!reviewed.checked || !report.value) return;
    const generation = revision;
    void Promise.resolve().then(() => navigator.clipboard.writeText(report.value)).then(() => { if (generation === revision) status.textContent = "Reviewed Scheduler report copied."; })
      .catch(() => { if (generation === revision) { report.focus(); report.select(); status.textContent = "Copy unavailable. Select and copy the reviewed report manually."; } });
  });
  download.addEventListener("click", () => {
    if (!reviewed.checked || !report.value) return;
    const url = URL.createObjectURL(new Blob([report.value], { type: "text/plain;charset=utf-8" }));
    const link = make("a"); link.href = url; link.download = "mpu-scheduler-investigation.txt"; link.click(); URL.revokeObjectURL(url);
    status.textContent = "Reviewed Scheduler report downloaded.";
  });
}
