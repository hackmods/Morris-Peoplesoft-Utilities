/**
 * Field Entry dialogs + eligibility preview UI (FE-01..04).
 */
import type { FieldEntryProfile, FieldEntryRow, MpuSettings } from "../storage/schema";
import { loadSettings, updateSettings } from "../storage/settings";
import {
  applyEligibilityReport,
  buildFindReplaceBuffer,
  captureFieldValues,
  clearEligibilityPreview,
  clearSessionBuffer,
  getSessionBuffer,
  matchBufferToPage,
  prepareSheetBuffer,
  setSessionBuffer,
  showEligibilityPreview,
  summarizeEligibility,
  type FieldEntryEligibilityReport,
  type FindReplacePair,
} from "./field-entry";

function announce(doc: Document, message: string): void {
  const live = doc.getElementById("mpu-live");
  if (live) live.textContent = message;
}
function openModalDialog(
  doc: Document,
  opts: {
    labelledBy: string;
    build: (dialog: HTMLDivElement, close: () => void) => void;
    initialFocus: string;
  },
): void {
  doc.getElementById("mpu-dialog")?.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "mpu-dialog";
  backdrop.className = "mpu-dialog-backdrop";
  backdrop.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", opts.labelledBy);

  const close = (): void => {
    doc.removeEventListener("keydown", onKey);
    backdrop.remove();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  opts.build(dialog, close);
  backdrop.appendChild(dialog);
  doc.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  doc.addEventListener("keydown", onKey);
  (dialog.querySelector(opts.initialFocus) as HTMLElement | null)?.focus();
}

function renderEligibilityBody(report: FieldEntryEligibilityReport): string {
  const lines = report.matches
    .slice(0, 40)
    .map((m) => {
      const status =
        m.status === "willWrite"
          ? "Will write"
          : m.status === "unchanged"
            ? "Unchanged"
            : m.status === "skipped"
              ? `Skipped (${m.reason || ""})`
              : "Unmatched";
      return `<li><code>${escapeHtml(m.key)}</code> — ${escapeHtml(status)}</li>`;
    })
    .join("");
  const more =
    report.matches.length > 40
      ? `<p class="mpu-dialog-hint">…and ${report.matches.length - 40} more</p>`
      : "";
  return `
    <p class="mpu-dialog-hint">${escapeHtml(summarizeEligibility(report))}</p>
    <p class="mpu-dialog-hint">Amber = will write · green = unchanged · gray dashed = skipped. Review highlights on the page, then Apply.</p>
    <ul class="mpu-fe-elig-list">${lines || "<li>Nothing to report</li>"}</ul>
    ${more}
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Show eligibility preview dialog then Apply / Cancel. */
export function showEligibilityPreviewDialog(
  doc: Document,
  buffer: FieldEntryRow[],
  title = "Field Entry — eligibility preview",
): void {
  const report = matchBufferToPage(buffer, doc);
  showEligibilityPreview(report, doc);

  openModalDialog(doc, {
    labelledBy: "mpu-fe-elig-title",
    initialFocus: report.willWrite > 0 ? "#mpu-fe-elig-apply" : "#mpu-fe-elig-cancel",
    build: (dialog, close) => {
      dialog.innerHTML = `
        <h2 id="mpu-fe-elig-title">${escapeHtml(title)}</h2>
        ${renderEligibilityBody(report)}
        <div class="mpu-dialog-actions">
          <button type="button" class="mpu-btn" id="mpu-fe-elig-apply" ${
            report.willWrite > 0 ? "" : "disabled"
          }>Apply ${report.willWrite} field${report.willWrite === 1 ? "" : "s"}</button>
          <button type="button" class="mpu-btn" id="mpu-fe-elig-cancel">Cancel</button>
        </div>
      `;
      dialog.querySelector("#mpu-fe-elig-cancel")?.addEventListener("click", () => {
        clearEligibilityPreview(doc);
        close();
      });
      dialog.querySelector("#mpu-fe-elig-apply")?.addEventListener("click", () => {
        const n = applyEligibilityReport(report, doc);
        announce(doc, `Applied ${n} field value${n === 1 ? "" : "s"} — save in PeopleSoft when ready`);
        close();
      });
    },
  });
}

export function runCapture(doc: Document): void {
  const rows = captureFieldValues(doc);
  announce(
    doc,
    rows.length
      ? `Captured ${rows.length} field value${rows.length === 1 ? "" : "s"}`
      : "No editable fields to capture",
  );
}

export function runPastePreview(doc: Document): void {
  const buf = getSessionBuffer();
  if (!buf.length) {
    announce(doc, "Session buffer empty — Capture, From sheet, or load a profile first");
    return;
  }
  showEligibilityPreviewDialog(doc, buf, "Paste — eligibility preview");
}

export function showSheetPasteDialog(doc: Document): void {
  openModalDialog(doc, {
    labelledBy: "mpu-fe-sheet-title",
    initialFocus: "#mpu-fe-sheet-text",
    build: (dialog, close) => {
      dialog.innerHTML = `
        <h2 id="mpu-fe-sheet-title">From sheet</h2>
        <p class="mpu-dialog-hint">Paste TSV/CSV with a header of <code>RECORD.FIELD</code> (or page labels). One data row fills the current page; <strong>multiple data rows</strong> map to grid occurrences (<code>$0</code>, <code>$1</code>, …) and click Add Row when more rows are needed.</p>
        <label class="mpu-dialog-label" for="mpu-fe-sheet-text">Spreadsheet paste
          <textarea id="mpu-fe-sheet-text" class="mpu-dialog-input mpu-fe-textarea" rows="10" autocomplete="off" spellcheck="false" placeholder="JOB.DEPTID&#9;JOB.JOBCODE&#10;100&#9;ABC&#10;200&#9;DEF"></textarea>
        </label>
        <div class="mpu-dialog-actions">
          <button type="button" class="mpu-btn" id="mpu-fe-sheet-preview">Preview</button>
          <button type="button" class="mpu-btn" id="mpu-fe-sheet-cancel">Cancel</button>
        </div>
      `;
      dialog.querySelector("#mpu-fe-sheet-cancel")?.addEventListener("click", () => close());
      dialog.querySelector("#mpu-fe-sheet-preview")?.addEventListener("click", () => {
        const text = (dialog.querySelector("#mpu-fe-sheet-text") as HTMLTextAreaElement).value;
        const prepared = prepareSheetBuffer(text, doc);
        if (prepared.error && !prepared.rows.length) {
          announce(doc, prepared.error);
          return;
        }
        if (prepared.error && prepared.rows.length) {
          announce(doc, prepared.error);
          // Still allow preview of what we can match
        } else if (prepared.grid?.clicked) {
          announce(doc, prepared.grid.message);
        }
        if (!prepared.rows.length) {
          announce(doc, "No columns matched RECORD.FIELD or page labels");
          return;
        }
        setSessionBuffer(prepared.rows);
        close();
        showEligibilityPreviewDialog(doc, prepared.rows, "From sheet — eligibility preview");
      });
    },
  });
}

export function showFindReplaceDialog(doc: Document): void {
  openModalDialog(doc, {
    labelledBy: "mpu-fe-fr-title",
    initialFocus: "#mpu-fe-fr-text",
    build: (dialog, close) => {
      dialog.innerHTML = `
        <h2 id="mpu-fe-fr-title">Find / Replace</h2>
        <p class="mpu-dialog-hint">One pair per line: <code>find → replace</code> or <code>find=replace</code>. Matches current editable field values exactly, then opens eligibility preview.</p>
        <label class="mpu-dialog-label" for="mpu-fe-fr-text">Pairs
          <textarea id="mpu-fe-fr-text" class="mpu-dialog-input mpu-fe-textarea" rows="8" autocomplete="off" spellcheck="false" placeholder="100 → 200&#10;OLDDEPT=NEWDEPT"></textarea>
        </label>
        <label class="mpu-dialog-label mpu-fe-check">
          <input type="checkbox" id="mpu-fe-fr-ci" /> Case-insensitive match
        </label>
        <div class="mpu-dialog-actions">
          <button type="button" class="mpu-btn" id="mpu-fe-fr-preview">Preview</button>
          <button type="button" class="mpu-btn" id="mpu-fe-fr-cancel">Cancel</button>
        </div>
      `;
      dialog.querySelector("#mpu-fe-fr-cancel")?.addEventListener("click", () => close());
      dialog.querySelector("#mpu-fe-fr-preview")?.addEventListener("click", () => {
        const text = (dialog.querySelector("#mpu-fe-fr-text") as HTMLTextAreaElement).value;
        const ci = (dialog.querySelector("#mpu-fe-fr-ci") as HTMLInputElement).checked;
        const pairs = parseFindReplaceText(text);
        if (!pairs.length) {
          announce(doc, "Add at least one find → replace pair");
          return;
        }
        const rows = buildFindReplaceBuffer(pairs, doc, ci);
        if (!rows.length) {
          announce(doc, "No editable fields matched the find values");
          return;
        }
        setSessionBuffer(rows);
        close();
        showEligibilityPreviewDialog(doc, rows, "Find / Replace — eligibility preview");
      });
    },
  });
}

export function parseFindReplaceText(text: string): FindReplacePair[] {
  const pairs: FindReplacePair[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const arrow = trimmed.split(/\s*→\s*|\s*->\s*/);
    if (arrow.length === 2) {
      pairs.push({ find: arrow[0], replace: arrow[1] });
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      pairs.push({ find: trimmed.slice(0, eq), replace: trimmed.slice(eq + 1) });
    }
  }
  return pairs;
}

export function showSaveProfileDialog(doc: Document, settings: MpuSettings): void {
  const buf = getSessionBuffer();
  if (!buf.length) {
    announce(doc, "Session buffer empty — capture or paste first");
    return;
  }
  openModalDialog(doc, {
    labelledBy: "mpu-fe-save-title",
    initialFocus: "#mpu-fe-save-name",
    build: (dialog, close) => {
      dialog.innerHTML = `
        <h2 id="mpu-fe-save-title">Save Field Entry profile</h2>
        <p class="mpu-dialog-hint" role="note">Profiles stay on this device and may contain business keys (EmplIDs, depts, etc.). Do not export casually.</p>
        <label class="mpu-dialog-label" for="mpu-fe-save-name">Profile name
          <input type="text" id="mpu-fe-save-name" class="mpu-dialog-input" autocomplete="off" />
        </label>
        <div class="mpu-dialog-actions">
          <button type="button" class="mpu-btn" id="mpu-fe-save-ok">Save</button>
          <button type="button" class="mpu-btn" id="mpu-fe-save-cancel">Cancel</button>
        </div>
      `;
      dialog.querySelector("#mpu-fe-save-cancel")?.addEventListener("click", () => close());
      dialog.querySelector("#mpu-fe-save-ok")?.addEventListener("click", () => {
        void (async () => {
          const name = (dialog.querySelector("#mpu-fe-save-name") as HTMLInputElement).value.trim();
          if (!name) {
            announce(doc, "Enter a profile name");
            return;
          }
          const profile: FieldEntryProfile = {
            id: `fe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            updatedAt: Date.now(),
            componentHint:
              settings.recentComponents?.[0]
                ? `${settings.recentComponents[0].Menu}.${settings.recentComponents[0].Component}`
                : undefined,
            rows: getSessionBuffer(),
          };
          await updateSettings((s) => ({
            ...s,
            fieldEntryProfiles: [...(s.fieldEntryProfiles || []), profile],
          }));
          announce(doc, `Saved profile “${name}” (${profile.rows.length} fields)`);
          close();
        })();
      });
    },
  });
}

export function showLoadProfileDialog(doc: Document, settings: MpuSettings): void {
  const profiles = settings.fieldEntryProfiles || [];
  if (!profiles.length) {
    announce(doc, "No saved Field Entry profiles — save one from the Entry menu");
    return;
  }
  openModalDialog(doc, {
    labelledBy: "mpu-fe-load-title",
    initialFocus: "#mpu-fe-load-select",
    build: (dialog, close) => {
      const opts = profiles
        .map(
          (p) =>
            `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} (${p.rows.length})</option>`,
        )
        .join("");
      dialog.innerHTML = `
        <h2 id="mpu-fe-load-title">Load Field Entry profile</h2>
        <label class="mpu-dialog-label" for="mpu-fe-load-select">Profile
          <select id="mpu-fe-load-select" class="mpu-dialog-input">${opts}</select>
        </label>
        <div class="mpu-dialog-actions">
          <button type="button" class="mpu-btn" id="mpu-fe-load-ok">Load &amp; preview</button>
          <button type="button" class="mpu-btn" id="mpu-fe-load-del">Delete</button>
          <button type="button" class="mpu-btn" id="mpu-fe-load-cancel">Cancel</button>
        </div>
      `;
      dialog.querySelector("#mpu-fe-load-cancel")?.addEventListener("click", () => close());
      dialog.querySelector("#mpu-fe-load-ok")?.addEventListener("click", () => {
        const id = (dialog.querySelector("#mpu-fe-load-select") as HTMLSelectElement).value;
        const profile = profiles.find((p) => p.id === id);
        if (!profile) return;
        setSessionBuffer(profile.rows);
        close();
        showEligibilityPreviewDialog(doc, profile.rows, `Profile “${profile.name}” — preview`);
      });
      dialog.querySelector("#mpu-fe-load-del")?.addEventListener("click", () => {
        void (async () => {
          const id = (dialog.querySelector("#mpu-fe-load-select") as HTMLSelectElement).value;
          const profile = profiles.find((p) => p.id === id);
          if (!profile) return;
          if (!window.confirm(`Delete profile “${profile.name}”?`)) return;
          await updateSettings((s) => ({
            ...s,
            fieldEntryProfiles: (s.fieldEntryProfiles || []).filter((p) => p.id !== id),
          }));
          announce(doc, `Deleted profile “${profile.name}”`);
          close();
        })();
      });
    },
  });
}

/** Alt+Shift+E — open From sheet as a quick entry point when feature is on. */
export async function openFieldEntryFromShortcut(doc: Document): Promise<void> {
  const settings = await loadSettings();
  if (settings.features.fieldEntryOption !== "Yes") {
    announce(doc, "Field Entry is off — enable it under Options → Optional / careful");
    return;
  }
  showSheetPasteDialog(doc);
}

export function clearBufferAndPreview(doc: Document): void {
  clearSessionBuffer();
  clearEligibilityPreview(doc);
  announce(doc, "Field Entry buffer cleared");
}
