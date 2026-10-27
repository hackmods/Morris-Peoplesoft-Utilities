import { CONFIG_LIMITS, parseConfiguration, compareConfigurations, renderConfigurationComparison, type ConfigurationFormat } from "./configuration-comparison";
import { mountInvestigationLayout } from "./investigation-layout";

function make<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, text?: string) {
  const node = doc.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Files are read only on explicit preview; neither raw content nor reports enter storage. */
export function bindConfigurationComparisonUI(doc: Document, root: HTMLElement): void {
  root.classList.add("mpu-comparison", "mpu-config-comparison");
  const heading = make(doc, "h2", "Compare configuration files");
  const intro = make(doc, "p", "Choose two sanitized configuration files to compare their text.");
  const limits = make(doc, "p", "Supported: INI-style sections with key=value, or JSON objects; both files must use the same format. Each file is limited to 256,000 UTF-8 bytes, 2,000 entries, 16 nesting levels and 4,000 characters per scalar. No PSADMIN override lists, templates, scripts, logs, includes or variable expansion. Comments, ordering and formatting are not compared. Matching text does not establish effective runtime configuration. Sanitize files before selecting them: masking is conservative and cannot detect every secret or business identifier.");
  const notice = "Sanitize files first. This compares text, not effective runtime configuration. Nothing is saved or sent over the network; files and reports stay in this tab. No server is read or changed.";
  const status = make(doc, "p", "Select two sanitized files, then preview their comparison."); status.setAttribute("aria-live", "polite"); status.id = "mpu-config-status";
  const field = (labelText: string, control: HTMLElement, id: string) => {
    const row = make(doc, "div"); const label = make(doc, "label", labelText);
    control.id = id; label.htmlFor = id; row.append(label, control); return row;
  };
  const inputs: HTMLInputElement[] = []; const formats: HTMLSelectElement[] = [];
  const sides = ["First", "Second"].map((side, index) => {
    const group = make(doc, "fieldset"); group.append(make(doc, "legend", `${side} configuration`));
    const format = make(doc, "select");
    for (const [value, label] of [["ini", "INI-style section/key=value"], ["json", "JSON object"]]) {
      const option = make(doc, "option", label); option.value = value; format.append(option);
    }
    const input = make(doc, "input"); input.type = "file"; input.accept = ".txt,.ini,.cfg,.json,text/plain,application/json";
    group.append(field(`${side} file format`, format, `mpu-config-format-${index}`), field(`${side} sanitized file`, input, `mpu-config-file-${index}`));
    inputs.push(input); formats.push(format); return group;
  });
  const preview = make(doc, "button", "Preview configuration comparison"); preview.type = "button";
  const clear = make(doc, "button", "Clear configuration files and report"); clear.type = "button";
  const report = make(doc, "textarea"); report.rows = 18; report.readOnly = true; report.setAttribute("aria-label", "Configuration comparison report");
  const reviewed = make(doc, "input"); reviewed.type = "checkbox"; reviewed.disabled = true;
  const review = field("I reviewed this report for sensitive information", reviewed, "mpu-config-reviewed");
  const copy = make(doc, "button", "Copy reviewed configuration report"); copy.type = "button"; copy.disabled = true;
  const download = make(doc, "button", "Download reviewed configuration report"); download.type = "button"; download.disabled = true;
  const sourceGrid = make(doc, "div"); sourceGrid.className = "mpu-investigation-source-grid"; sourceGrid.append(...sides);
  report.rows = 10;
  mountInvestigationLayout(doc, root, {
    heading, intro, notice, guidance: [limits], sources: [sourceGrid],
    preview: [preview, clear, status], review: [report, review, copy, download],
  });
  let revision = 0;
  const invalidate = () => {
    revision++; report.value = ""; reviewed.checked = false; reviewed.disabled = true;
    copy.disabled = download.disabled = true; preview.disabled = false;
  };
  const reset = () => { invalidate(); inputs.forEach(input => { input.value = ""; }); status.textContent = "Selected files and report cleared from this tab."; };
  inputs.forEach(input => input.addEventListener("change", () => { invalidate(); status.textContent = "File selection changed. Prepare a fresh preview."; }));
  formats.forEach(format => format.addEventListener("change", () => { invalidate(); status.textContent = "Format changed. Prepare a fresh preview."; }));
  clear.addEventListener("click", reset);
  doc.defaultView?.addEventListener("pagehide", reset);
  reviewed.addEventListener("change", () => { copy.disabled = download.disabled = !reviewed.checked || !report.value; });
  preview.addEventListener("click", () => {
    invalidate(); const generation = revision;
    const files = inputs.map(input => input.files?.[0]);
    if (!files[0] || !files[1]) { status.textContent = "Select both sanitized files explicitly."; return; }
    // Check size before allocating the file contents. Parser checks actual UTF-8 size too.
    if (files.some(file => file!.size > CONFIG_LIMITS.maxBytes)) { status.textContent = `Each file must be at most ${CONFIG_LIMITS.maxBytes.toLocaleString("en-US")} bytes.`; return; }
    const selectedFormats = formats.map(format => format.value as ConfigurationFormat);
    if (selectedFormats[0] !== selectedFormats[1]) { status.textContent = "Choose the same supported format for both files."; return; }
    preview.disabled = true; status.textContent = "Reading selected files locally…";
    void (async () => {
      const texts = await Promise.all(files.map(file => file!.arrayBuffer().then(buffer => new TextDecoder("utf-8", { fatal: true }).decode(buffer))));
      if (generation !== revision || !root.isConnected) return;
      const result = compareConfigurations(parseConfiguration(texts[0], selectedFormats[0]), parseConfiguration(texts[1], selectedFormats[1]));
      report.value = renderConfigurationComparison(result); reviewed.disabled = false; report.focus();
      status.textContent = "Preview ready. Masked entries were not compared. Review all remaining content before enabling export; file names are omitted.";
    })().catch(() => {
      if (generation !== revision || !root.isConnected) return;
      // Never surface browser/parser errors that might include raw text or file names.
      status.textContent = "Cannot compare these files. Check UTF-8 encoding, selected formats, duplicate keys and the supported formats and limits above.";
    }).finally(() => { if (generation === revision) preview.disabled = false; });
  });
  copy.addEventListener("click", () => {
    if (!reviewed.checked || !report.value) return;
    const generation = revision;
    void navigator.clipboard.writeText(report.value).then(() => { if (generation === revision) status.textContent = "Reviewed configuration report copied."; })
      .catch(() => { if (generation === revision) { report.focus(); report.select(); status.textContent = "Copy unavailable. Select and copy the reviewed report manually."; } });
  });
  download.addEventListener("click", () => {
    if (!reviewed.checked || !report.value) return;
    const url = URL.createObjectURL(new Blob([report.value], { type: "text/plain;charset=utf-8" }));
    const link = make(doc, "a"); link.href = url; link.download = "mpu-configuration-comparison.txt"; link.click(); URL.revokeObjectURL(url);
    status.textContent = "Reviewed configuration report downloaded.";
  });
}
