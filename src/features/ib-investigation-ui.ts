import { IB_LIMITS, renderIbInvestigation } from "./ib-investigation";
import { bindIbCaseUI } from "./ib-case-ui";
import { mountInvestigationLayout } from "./investigation-layout";

/** Explicit, local file reads; never attach active-page or clipboard evidence. */
export function bindIbInvestigationUI(doc: Document, root: HTMLElement): void {
  const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; return node;
  };
  const field = (text: string, control: HTMLElement, id: string) => {
    const label = make("label", text); control.id = id; label.htmlFor = id;
    const row = make("div"); row.append(label, control); return row;
  };
  const button = (text: string, id: string) => { const node = make("button", text); node.type = "button"; node.id = id; return node; };
  root.classList.add("mpu-comparison", "mpu-ib-investigation");
  const heading = make("h2", "Integration Broker investigation");
  const intro = make("p", "Choose evidence sources, preview the investigation, then review the report before export.");
  const notice = "Sanitize evidence first. Nothing is saved or sent over the network; no server actions are taken. Prepared mpu-ib-evidence JSON or the manual form only; native monitor/gateway exports are not accepted.";
  const scope = make("p", 'Supported: mpu-ib-evidence JSON envelopes, versions 1 and 2, or records prepared in the form below. Version 2 adds environmentLabel, operationVersion, observedAt, correlationId, subQueue, errorLocation, evidenceNote, payloadRole, payloadVariant (original/transformed/unknown) and payloadXml. This is not a native monitor or gateway export parser. Metadata is reported evidence; no status, routing, delivery or root cause is inferred. Synthetic samples do not verify real-system compatibility.');
  const limits = make("p", "Limits: 1–4 sources including the optional draft; 256,000 bytes, 50 records and 2,000 entries per source, 16 total nesting levels, 256 characters per path segment, 200 characters per metadata value and 4,000 per payload scalar/error/note or XML excerpt. Report limit: 1,000,000 bytes. XML/SOAP subset v1 is bounded inert payload text in version 2, not a native export parser. DTDs, custom entities, processing instructions, raw HTTP and native logs are unsupported. Unknown schema properties, duplicate keys and overflows reject the whole preview.");
  const privacy = make("p", "Sanitize samples before selecting them. Conservative masking can over-mask evidence and cannot detect every secret or business identifier. Sensitive keys, subtrees and suspicious values are masked before reporting. Payload details are omitted by default; including them requires a new preview and review. Review remaining metadata, payload paths and values for business context and scope. Selected filenames are omitted; keep originals to resolve source/line/JSON Pointer citations. Matching IDs or reported statuses do not prove a shared transaction or end-to-end success.");
  const example = make("details"); const exampleSummary = make("summary", "Show synthetic JSON envelope example");
  const sample = make("pre", JSON.stringify({ format: "mpu-ib-evidence", version: 1, records: [{ serviceOperation: "SYNTHETIC_OPERATION", operationType: "unknown", direction: "unknown", stage: "unknown", payload: { reference: "SANITIZED_SAMPLE" } }] }, null, 2));
  example.append(exampleSummary, sample);
  const files = make("input"); files.type = "file"; files.multiple = true; files.accept = ".json,application/json";
  const caseRoot = make("div"); caseRoot.id = "mpu-ib-case-workspace";
  const include = make("input"); include.type = "checkbox";
  const status = make("p"); status.id = "mpu-ib-status"; status.setAttribute("aria-live", "polite");
  status.textContent = "Choose sanitized JSON files or prepare a manual form source, then preview the investigation.";
  const preview = button("Preview IB investigation", "mpu-ib-preview");
  const clear = button("Clear IB evidence and report", "mpu-ib-clear");
  const report = make("textarea"); report.rows = 10; report.readOnly = true;
  const reviewed = make("input"); reviewed.type = "checkbox"; reviewed.disabled = true;
  const copy = button("Copy reviewed IB report", "mpu-ib-copy"); copy.disabled = true;
  const download = button("Download reviewed IB report", "mpu-ib-download"); download.disabled = true;
  mountInvestigationLayout(doc, root, {
    heading,
    intro,
    notice,
    guidance: [scope, limits, privacy],
    sources: [
      field("Sanitized IB JSON evidence files", files, "mpu-ib-files"),
      example,
      caseRoot,
    ],
    preview: [
      field("Include sanitized payload detail in the next preview", include, "mpu-ib-include-payload"),
      preview,
      clear,
      status,
    ],
    review: [
      field("IB investigation report", report, "mpu-ib-report"),
      field("I reviewed this IB report for sensitive information and scope", reviewed, "mpu-ib-reviewed"),
      copy,
      download,
    ],
  });
  let revision = 0;
  const invalidate = () => {
    revision++; report.value = ""; reviewed.checked = false; reviewed.disabled = true;
    copy.disabled = download.disabled = true; preview.disabled = false;
  };
  const caseUI = bindIbCaseUI(doc, caseRoot, sourcesChanged => { invalidate(); if (sourcesChanged) caseUI.clearChoices(); status.textContent = "Draft, comparison or review changed. Prepare and review a fresh report."; });
  const reset = () => { invalidate(); caseUI.clear(); files.value = ""; include.checked = false; status.textContent = "IB evidence and report cleared from this tab."; };
  files.addEventListener("change", () => { invalidate(); caseUI.clearChoices(); status.textContent = "File selection changed. Prepare a fresh preview."; });
  include.addEventListener("change", () => { invalidate(); status.textContent = "Payload inclusion changed. Prepare a fresh preview and review it again."; });
  clear.addEventListener("click", reset); doc.defaultView?.addEventListener("pagehide", reset);
  reviewed.addEventListener("change", () => { copy.disabled = download.disabled = !reviewed.checked || !report.value; });
  preview.addEventListener("click", () => {
    invalidate(); const generation = revision; const selected = Array.from(files.files ?? []); const withPayload = include.checked; const draft = caseUI.draftSource();
    if (selected.length + (draft ? 1 : 0) < 1 || selected.length + (draft ? 1 : 0) > IB_LIMITS.maxFiles) { status.textContent = "Select between 1 and 4 evidence sources: JSON files and/or the explicit draft."; return; }
    if (selected.some(file => file.size > IB_LIMITS.maxBytes)) { status.textContent = "Each file must be at most 256,000 bytes. Use smaller samples."; return; }
    preview.disabled = true; status.textContent = "Reading selected samples locally…";
    void (async () => {
      const loaded = await Promise.all(selected.map(file => file.arrayBuffer().then(buffer => new TextDecoder("utf-8", { fatal: true }).decode(buffer))));
      const texts = draft ? [draft, ...loaded] : loaded;
      if (generation !== revision || !root.isConnected) return;
      caseUI.setSources(texts);
      report.value = renderIbInvestigation(texts, withPayload, caseUI.options()); reviewed.disabled = false; report.focus();
      status.textContent = "Preview ready. Review scope and all unmasked content before export; supplied statuses and routes are unverified.";
    })().catch(() => {
      if (generation !== revision || !root.isConnected) return;
      status.textContent = "Cannot prepare this investigation. Check the versioned JSON/XML syntax, duplicate keys, UTF-8 encoding, limits and two distinct comparison selections. No partial report is available.";
    }).finally(() => { if (generation === revision) preview.disabled = false; });
  });
  copy.addEventListener("click", () => {
    if (!reviewed.checked || !report.value) return;
    const generation = revision; const text = report.value;
    void Promise.resolve().then(() => navigator.clipboard.writeText(text)).then(() => { if (generation === revision) status.textContent = "Reviewed IB report copied."; })
      .catch(() => { if (generation === revision) { report.focus(); report.select(); status.textContent = "Copy unavailable. Select and copy the reviewed report manually."; } });
  });
  download.addEventListener("click", () => {
    if (!reviewed.checked || !report.value) return;
    const url = URL.createObjectURL(new Blob([report.value], { type: "text/plain;charset=utf-8" }));
    const link = make("a"); link.href = url; link.download = "mpu-ib-investigation.txt"; link.click(); URL.revokeObjectURL(url);
    status.textContent = "Reviewed IB report downloaded.";
  });
}
