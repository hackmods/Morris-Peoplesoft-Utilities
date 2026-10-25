import { getExtensionApi } from "../platform/browser";
import { collectPageMeta, getTargetDocument, parsePsUrl, type ParsedPsUrl } from "../adapters/ps-page";
import { capturePageFingerprint } from "./upgrade-watch";
import { bindModalDialog } from "./dialog";
import { currentPageAccess } from "./access";
import {
  ENVIRONMENT_COMPARISON_MESSAGE, loadEnvironmentComparisons, requestEnvironmentComparisonMutation,
  validateEnvironmentSnapshot,
} from "../storage/environment-comparisons";
import { formatEnvironmentComparison, type EnvironmentSnapshot } from "./environment-comparison";

function make<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, text?: string) {
  const node = doc.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
const errorText = (error: unknown) => error instanceof Error ? error.message : "Comparison workspace unavailable. Please retry.";

/** Explicit prepare -> review -> save. Full URLs live only in this closure. */
export async function showComparisonCaptureDialog(doc: Document, parsed: ParsedPsUrl): Promise<void> {
  const href = doc.location.href;
  if (parsed.kind !== "component" || parsed.href !== href) return;
  let settings = await currentPageAccess(parsed, "pageInfoOption");
  if (!settings || doc.location.href !== href) return;
  const store = await loadEnvironmentComparisons();
  settings = await currentPageAccess(parsed, "pageInfoOption");
  if (doc.location.href !== href || !settings) return;
  const target = getTargetDocument(doc);
  const targetHref = target.location.href;
  const targetParsed = parsePsUrl(targetHref);
  const meta = collectPageMeta(doc);
  const fingerprint = capturePageFingerprint(doc, parsed, meta);
  const mapping = settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized];
  const environment = mapping ? settings.environments[mapping.envId]?.label || parsed.siteNormalized : parsed.siteNormalized;
  const snapshot: EnvironmentSnapshot = {
    id: `snapshot-${crypto.randomUUID()}`, label: `${fingerprint.menu}.${fingerprint.component}`.slice(0, 120),
    environment, origin: new URL(parsed.baseURL).origin, site: parsed.siteNormalized,
    targetOrigin: targetParsed.origin || "", targetSite: targetParsed.siteNormalized || "",
    capturedAt: Date.now(), extensionVersion: getExtensionApi().runtime.getManifest().version,
    applicationRelease: meta.appsRel || "", fingerprint,
    captureWarnings: ["Only the selected loaded document was scanned; inaccessible frames and unloaded tabs are not captured."],
  };
  if (fingerprint.menu !== parsed.menu || fingerprint.component !== parsed.component) snapshot.captureWarnings.push("Loaded metadata differs from the portal URL object; verify the owning component before comparison.");
  if (!targetParsed.origin || !targetParsed.siteNormalized) snapshot.captureWarnings.push("Owning target origin/site could not be established from its URL.");
  if (targetParsed.origin && (targetParsed.origin !== parsed.origin || targetParsed.siteNormalized !== parsed.siteNormalized)) snapshot.captureWarnings.push("Portal and owning target scopes differ; review both before comparing.");
  if (snapshot.fingerprint.tabLabels.length > 40) {
    snapshot.fingerprint.tabLabels = snapshot.fingerprint.tabLabels.slice(0, 40);
    snapshot.captureWarnings.push("Tab labels were capped at 40; this capture is incomplete.");
  }
  doc.getElementById("mpu-dialog")?.remove();
  const backdrop = make(doc, "div"); backdrop.id = "mpu-dialog"; backdrop.className = "mpu-dialog-backdrop";
  const dialog = make(doc, "div"); dialog.className = "mpu-dialog";
  dialog.setAttribute("role", "dialog"); dialog.setAttribute("aria-modal", "true"); dialog.setAttribute("aria-labelledby", "mpu-comparison-capture-title");
  const heading = make(doc, "h2", "Review environment snapshot"); heading.id = "mpu-comparison-capture-title";
  const hint = make(doc, "p", "Review browser UI metadata before saving on this device. Field identifiers and UI labels may contain business context. This does not compare server objects or database configuration.");
  const label = make(doc, "label", "Snapshot label"); label.className = "mpu-dialog-label";
  const name = make(doc, "input"); name.maxLength = 120; name.value = snapshot.label; name.className = "mpu-dialog-input"; label.append(name);
  const preview = make(doc, "pre", JSON.stringify(snapshot, null, 2)); preview.className = "mpu-pre";
  preview.setAttribute("aria-label", "Snapshot metadata preview");
  const status = make(doc, "p"); status.setAttribute("aria-live", "polite");
  const save = make(doc, "button", "Save reviewed snapshot"); save.type = "button"; save.className = "mpu-btn";
  const cancel = make(doc, "button", "Cancel"); cancel.type = "button"; cancel.className = "mpu-btn";
  const actions = make(doc, "div"); actions.className = "mpu-dialog-actions"; actions.append(save, cancel);
  dialog.append(heading, hint, label, preview, status, actions); backdrop.append(dialog);
  const close = bindModalDialog(doc, backdrop, dialog);
  cancel.addEventListener("click", close);
  backdrop.addEventListener("click", event => { if (event.target === backdrop) close(); });
  name.addEventListener("input", () => { snapshot.label = name.value.trim(); preview.textContent = JSON.stringify(snapshot, null, 2); });
  let busy = false;
  save.addEventListener("click", () => {
    if (busy) return;
    busy = true;
    void (async () => {
      if (!name.value.trim()) throw new Error("Enter a snapshot label.");
      if (!validateEnvironmentSnapshot({ ...snapshot, label: name.value.trim() })) throw new Error("Snapshot metadata exceeds supported bounds. Select a smaller loaded page and prepare a fresh capture.");
      if (!await currentPageAccess(parsed, "pageInfoOption") || !dialog.isConnected || doc.location.href !== href || getTargetDocument(doc) !== target || target.location.href !== targetHref) throw new Error("Page or access changed. Close this preview and prepare a fresh snapshot.");
      await requestEnvironmentComparisonMutation({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "addSnapshot", baseRevision: store.revision, snapshot: { ...snapshot, label: name.value.trim() } });
      close();
      const live = doc.getElementById("mpu-live"); if (live) live.textContent = "Snapshot saved locally. Compare two explicit snapshots in Options → Compare environments.";
    })().catch(error => { if (dialog.isConnected) status.textContent = errorText(error); }).finally(() => { busy = false; });
  });
  doc.body.append(backdrop); name.focus();
}

/** All comparisons are chosen explicitly from local immutable snapshots. */
export function bindEnvironmentComparisonUI(doc: Document, root: HTMLElement): void {
  root.classList.add("mpu-comparison");
  const heading = make(doc, "h2", "Compare environments");
  const intro = make(doc, "p", "Prepare and review each snapshot in PeopleSoft → Page Info. Select two snapshots here to compare observed UI metadata. Matching browser metadata does not establish PeopleCode, SQL, database, security or configuration equivalence. Captures cover loaded content only.");
  const status = make(doc, "p"); status.setAttribute("aria-live", "polite");
  const reload = make(doc, "button", "Reload comparison workspace (clears preview)"); reload.type = "button";
  const first = make(doc, "select"); const second = make(doc, "select");
  const field = (text: string, control: HTMLElement) => {
    const row = make(doc, "div"); const label = make(doc, "label", text);
    control.id = `mpu-comparison-${crypto.randomUUID()}`; label.htmlFor = control.id;
    row.append(label, control); return row;
  };
  const name = make(doc, "input"); name.maxLength = 120;
  const compare = make(doc, "button", "Preview selected comparison"); compare.type = "button";
  const report = make(doc, "textarea"); report.rows = 14; report.readOnly = true; report.setAttribute("aria-label", "Environment comparison report");
  const save = make(doc, "button", "Save reviewed comparison"); save.type = "button"; save.disabled = true;
  const copy = make(doc, "button", "Copy reviewed report"); copy.type = "button"; copy.disabled = true;
  const download = make(doc, "button", "Download reviewed report"); download.type = "button"; download.disabled = true;
  const snapshotsHeading = make(doc, "h3", "Saved snapshots"); const snapshots = make(doc, "ul");
  const historyHeading = make(doc, "h3", "Saved comparisons"); const history = make(doc, "ul");
  root.replaceChildren(heading, intro, status, reload, field("First snapshot", first), field("Second snapshot", second), field("Comparison label", name), compare, report, save, copy, download, snapshotsHeading, snapshots, historyHeading, history);
  let store: Awaited<ReturnType<typeof loadEnvironmentComparisons>> | null = null;
  let previewIds: [string, string] | null = null;
  let busy = false;
  const invalidate = () => { previewIds = null; report.value = ""; save.disabled = copy.disabled = download.disabled = true; };
  const chosen = () => store ? [store.snapshots.find(s => s.id === first.value), store.snapshots.find(s => s.id === second.value)] : [];
  const mutate = async (action: Parameters<typeof requestEnvironmentComparisonMutation>[0]) => {
    if (busy) return;
    busy = true;
    try { store = await requestEnvironmentComparisonMutation(action); invalidate(); render(); status.textContent = "Comparison workspace saved on this device."; }
    catch (error) { status.textContent = errorText(error); }
    finally { busy = false; }
  };
  const render = () => {
    if (!store) return;
    for (const select of [first, second]) {
      const prior = select.value;
      select.replaceChildren(make(doc, "option", "Choose a snapshot")); select.options[0].value = "";
      for (const snapshot of store.snapshots) {
        const option = make(doc, "option", `${snapshot.label} · ${snapshot.environment} · ${snapshot.origin}/${snapshot.site} · ${new Date(snapshot.capturedAt).toISOString()}`);
        option.value = snapshot.id; select.append(option);
      }
      select.value = prior;
    }
    snapshots.replaceChildren(...store.snapshots.map(snapshot => {
      const row = make(doc, "li", `${snapshot.label} — ${snapshot.environment} — ${snapshot.origin}/${snapshot.site} — ${new Date(snapshot.capturedAt).toISOString()} `);
      const remove = make(doc, "button", `Delete snapshot ${snapshot.label}`); remove.type = "button";
      remove.addEventListener("click", () => { if (store) void mutate({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "deleteSnapshot", baseRevision: store.revision, id: snapshot.id }).then(() => reload.focus()); });
      row.append(remove); return row;
    }));
    history.replaceChildren(...store.comparisons.map(entry => {
      const row = make(doc, "li");
      const open = make(doc, "button", `Review ${entry.label} · ${new Date(entry.savedAt).toISOString()}`); open.type = "button";
      open.addEventListener("click", () => { if (busy) return; invalidate(); report.value = formatEnvironmentComparison(entry.left, entry.right, entry.label); copy.disabled = download.disabled = false; report.focus(); });
      const remove = make(doc, "button", `Delete comparison ${entry.label}`); remove.type = "button";
      remove.addEventListener("click", () => { if (store) void mutate({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "deleteComparison", baseRevision: store.revision, id: entry.id }).then(() => reload.focus()); });
      row.append(open, remove); return row;
    }));
  };
  const load = async () => {
    if (busy) return;
    busy = true;
    try { store = await loadEnvironmentComparisons(); invalidate(); render(); status.textContent = `${store.snapshots.length} snapshots and ${store.comparisons.length} comparisons loaded. Choose both sides explicitly.`; }
    catch (error) { status.textContent = errorText(error); }
    finally { busy = false; }
  };
  reload.addEventListener("click", () => { void load(); });
  first.addEventListener("change", invalidate); second.addEventListener("change", invalidate);
  name.addEventListener("input", invalidate);
  compare.addEventListener("click", () => {
    if (busy) return;
    const [left, right] = chosen();
    if (!left || !right || left.id === right.id) { invalidate(); status.textContent = "Select two distinct snapshots explicitly."; return; }
    report.value = formatEnvironmentComparison(left, right, name.value.trim() || "Environment comparison");
    previewIds = [left.id, right.id]; save.disabled = copy.disabled = download.disabled = false; report.focus();
    status.textContent = "Review both scopes, dates, versions and capture limits before saving or sharing.";
  });
  save.addEventListener("click", () => {
    if (!store || !previewIds || busy) return;
    if (!name.value.trim()) { status.textContent = "Enter a comparison label before saving."; name.focus(); return; }
    void mutate({ type: ENVIRONMENT_COMPARISON_MESSAGE, action: "saveComparison", baseRevision: store.revision, id: `comparison-${crypto.randomUUID()}`, label: name.value.trim(), leftId: previewIds[0], rightId: previewIds[1] }).then(() => compare.focus());
  });
  copy.addEventListener("click", () => {
    if (!report.value) return;
    void navigator.clipboard.writeText(report.value).then(() => { status.textContent = "Reviewed report copied. It includes environment origins and technical labels."; })
      .catch(() => { report.focus(); report.select(); status.textContent = "Copy unavailable. Select and copy the reviewed report manually."; });
  });
  download.addEventListener("click", () => {
    if (!report.value) return;
    const url = URL.createObjectURL(new Blob([report.value], { type: "text/plain;charset=utf-8" }));
    const link = make(doc, "a"); link.href = url; link.download = "mpu-environment-comparison.txt"; link.click(); URL.revokeObjectURL(url);
    status.textContent = "Reviewed report downloaded. Review environment origins and business context before sharing.";
  });
  void load();
}
