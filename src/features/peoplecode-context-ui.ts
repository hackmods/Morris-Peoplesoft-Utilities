import { buildPeopleCodeStubs } from "./peoplecode-aids";

/** One contextual reference example; no field values or persistent drafts. */
export function bindPeopleCodeContextUI(doc: Document, host: HTMLElement, input: { record?: string; field?: string; lockedId?: string },
  canContinue: () => Promise<boolean>, copyText: (text: string) => Promise<unknown>): void {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const el = doc.createElement(tag); if (text) el.textContent = text; return el;
  };
  const status = make("p"); status.setAttribute("aria-live", "polite");
  if ((!input.record || !input.field) && !input.lockedId) {
    host.append(make("p", "No field locked. Close this dialog, use Inspect to lock the intended field, then reopen PCode. Documentation and the agent task form remain available."));
    return;
  }
  const record = make("input"); record.id = "mpu-pcode-record"; record.maxLength = 64; record.autocomplete = "off"; record.value = input.record || "";
  const name = make("input"); name.id = "mpu-pcode-field"; name.maxLength = 64; name.autocomplete = "off"; name.value = input.field || "";
  const event = make("select"); event.id = "mpu-pcode-event";
  for (const [value, label] of [["", "Choose an event"], ["FieldChange", "FieldChange — changed field and row"], ["RowInit", "RowInit — row initialization"]]) {
    const option = make("option", label); option.value = value; event.append(option);
  }
  const context = make("input"); context.id = "mpu-pcode-context"; context.maxLength = 500; context.autocomplete = "off";
  const confirmed = make("input"); confirmed.type = "checkbox"; confirmed.id = "mpu-pcode-context-confirmed";
  const field = (labelText: string, control: HTMLElement) => { const label = make("label", labelText); label.htmlFor = control.id; const row = make("p"); row.append(label, " ", control); return row; };
  const preview = make("button", "Preview contextual example"); preview.type = "button";
  const code = make("pre"); code.className = "mpu-pre"; code.tabIndex = 0; code.setAttribute("role", "region"); code.setAttribute("aria-label", "Contextual PeopleCode example");
  const copy = make("button", "Copy contextual example"); copy.type = "button"; copy.disabled = true;
  let generation = 0;
  const invalidate = () => { generation++; code.textContent = ""; copy.disabled = true; status.textContent = "Context changed. Prepare a fresh preview."; };
  record.addEventListener("input", invalidate); name.addEventListener("input", invalidate);
  event.addEventListener("change", invalidate); context.addEventListener("input", invalidate); confirmed.addEventListener("change", invalidate);
  preview.addEventListener("click", () => {
    invalidate(); const revision = generation;
    const example = buildPeopleCodeStubs({ record: record.value, field: name.value, event: event.value, rowContext: context.value });
    if (!confirmed.checked || !example.length) { status.textContent = "Confirm record/field names, choose an event, describe the intended row/scroll context and confirm you verified it in App Designer. Use identifiers with letters, digits and underscores and a single-line context without control characters."; return; }
    void canContinue().then(allowed => {
      if (revision !== generation || !host.isConnected) return;
      if (!allowed) { status.textContent = "PCode is no longer available for this page. Check activation and feature settings."; return; }
      code.textContent = example[0].stub; copy.disabled = false; code.focus();
      status.textContent = "Reference example ready. Review the event and row context; no business rule or server code has been verified.";
    }).catch(() => { if (revision === generation && host.isConnected) status.textContent = "Could not check current page access. Try again."; });
  });
  copy.addEventListener("click", () => {
    const revision = generation; const text = code.textContent;
    if (copy.disabled || !text) return;
    void canContinue().then(async allowed => {
      if (revision !== generation || !host.isConnected) return;
      if (!allowed) { invalidate(); status.textContent = "PCode is no longer available for this page."; return; }
      await copyText(text);
    }).catch(() => { if (revision === generation && host.isConnected) status.textContent = "Could not copy the example."; });
  });
  host.append(make("p", `Locked DOM field: ${input.lockedId || `${input.record}.${input.field}`}. Record/field hints may be ambiguous; verify and correct them in App Designer.`),
    field("Verified record name", record), field("Verified field name", name), field("Intended PeopleCode event", event), field("Verified row/scroll context (up to 500 characters)", context),
    field("I verified this event and row context in App Designer", confirmed), preview, status, code, copy);
}
