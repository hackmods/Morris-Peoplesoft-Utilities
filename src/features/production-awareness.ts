import { getExtensionApi } from "../platform/browser";
import { detectUiModel, type ParsedPsUrl } from "../adapters/ps-page";
import { featureAllowedForUi, type MpuSettings } from "../storage/schema";
import { currentPageAccess } from "./access";
import { bindModalDialog } from "./dialog";

type WriteFeature = "fieldEntryOption" | "traceOption";

export function environmentForPage(settings: MpuSettings, parsed: ParsedPsUrl) {
  const index = settings.urlSites[parsed.baseURL]?.[parsed.siteNormalized]?.envId;
  return { index, environment: index === undefined ? undefined : settings.environments[index] };
}

/** Consent is for one action in one page/environment, never stored or reused. */
export function confirmProductionAction(doc: Document, label: string, action: string): Promise<boolean> {
  return new Promise((resolve) => {
    doc.getElementById("mpu-dialog")?.remove();
    const backdrop = doc.createElement("div");
    backdrop.id = "mpu-dialog";
    backdrop.className = "mpu-dialog-backdrop";
    const dialog = doc.createElement("div");
    dialog.className = "mpu-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "mpu-production-title");
    dialog.innerHTML = '<h2 id="mpu-production-title">Confirm production action</h2><p id="mpu-production-context"></p><p>PeopleSoft validation and save protections still apply.</p><div class="mpu-dialog-actions"><button type="button" class="mpu-btn" id="mpu-production-cancel">Cancel</button><button type="button" class="mpu-btn" id="mpu-production-confirm">Continue in production</button></div>';
    dialog.querySelector("#mpu-production-context")!.textContent = `${action} in production environment “${label}”?`;
    let accepted = false;
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes.mpuSettings) close();
    };
    const close = bindModalDialog(doc, backdrop, dialog, () => {
      getExtensionApi().storage.onChanged.removeListener(changed);
      resolve(accepted);
    });
    dialog.querySelector("#mpu-production-cancel")!.addEventListener("click", close);
    dialog.querySelector("#mpu-production-confirm")!.addEventListener("click", () => { accepted = true; close(); });
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
    getExtensionApi().storage.onChanged.addListener(changed);
    backdrop.append(dialog);
    doc.body.append(backdrop);
    (dialog.querySelector("#mpu-production-cancel") as HTMLButtonElement).focus();
  });
}

/** Recheck activation, UI scope, page and explicit classification after consent
 * and before every trace request. Field targets are separately checked at Apply. */
export async function authorizeWriteAction(doc: Document, parsed: ParsedPsUrl, feature: WriteFeature, action: string,
  confirm = confirmProductionAction,
): Promise<{ settings: MpuSettings; canContinue: () => Promise<boolean> } | null> {
  if (["unknown", "login", "logout"].includes(parsed.kind)) return null;
  const href = doc.location.href;
  if (parsed.href !== href) return null;
  const read = async () => {
    if (doc.location.href !== href) return null;
    const settings = await currentPageAccess(parsed, feature);
    if (!settings || doc.location.href !== href) return null;
    if (feature === "fieldEntryOption" && !featureAllowedForUi(settings.featureUiScopes.fieldEntryOption, detectUiModel(doc))) return null;
    return settings;
  };
  const settings = await read();
  if (!settings) return null;
  const stamp = (s: MpuSettings) => {
    const { index, environment } = environmentForPage(s, parsed);
    return JSON.stringify([index, environment?.label, environment?.classification || "unclassified",
      feature === "traceOption" ? s.traceSettings : s.featureUiScopes.fieldEntryOption]);
  };
  const before = stamp(settings);
  const environment = environmentForPage(settings, parsed).environment;
  if (environment?.classification === "production" && !await confirm(doc, environment.label, action)) return null;
  const canContinue = async () => { const latest = await read(); return !!latest && stamp(latest) === before; };
  return await canContinue() ? { settings, canContinue } : null;
}
