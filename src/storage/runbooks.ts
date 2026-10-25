import { getExtensionApi } from "../platform/browser";
export const RUNBOOK_STORAGE_KEY = "mpuEnvironmentRunbooks";
export const RUNBOOK_MESSAGE = "mpu-environment-runbooks";
export const RUNBOOK_LIMIT = 100;
export const RUNBOOK_TEXT_LIMIT = 4000;
export const RUNBOOK_LINK_LIMIT = 12;
export const RUNBOOK_JSON_LIMIT = 256_000;

export interface RunbookLink { label: string; url: string }
export interface EnvironmentRunbook {
  id: string;
  environment: string;
  component: string;
  title: string;
  notes: string;
  links: RunbookLink[];
  updatedAt: number;
}
export interface RunbookStore { revision: number; runbooks: EnvironmentRunbook[] }
export interface RunbookExport { format: "mpu-runbooks"; version: 1; runbooks: EnvironmentRunbook[] }
export type RunbookMutation =
  | { type: typeof RUNBOOK_MESSAGE; action: "save"; baseRevision: number; runbook: EnvironmentRunbook }
  | { type: typeof RUNBOOK_MESSAGE; action: "delete"; baseRevision: number; id: string }
  | { type: typeof RUNBOOK_MESSAGE; action: "import"; baseRevision: number; runbooks: EnvironmentRunbook[] };
export type RunbookReply = { ok: true; store: RunbookStore } | { ok: false; error: string; conflict?: boolean };

const ownObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const cleanText = (value: unknown, max: number): string | null => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
const validId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);

export function validateRunbook(value: unknown): EnvironmentRunbook | null {
  if (!ownObject(value) || Object.keys(value).some((key) => !["id", "environment", "component", "title", "notes", "links", "updatedAt"].includes(key))) return null;
  const environment = cleanText(value.environment, 120);
  const component = cleanText(value.component, 160);
  const title = cleanText(value.title, 160);
  if (!validId(value.id) || !environment || !component || !title || typeof value.notes !== "string" || value.notes.length > RUNBOOK_TEXT_LIMIT || !Array.isArray(value.links) || value.links.length > RUNBOOK_LINK_LIMIT || typeof value.updatedAt !== "number" || !Number.isFinite(new Date(value.updatedAt).getTime())) return null;
  const links: RunbookLink[] = [];
  for (const entry of value.links) {
    if (!ownObject(entry) || Object.keys(entry).some((key) => !["label", "url"].includes(key))) return null;
    const label = cleanText(entry.label, 120);
    if (!label || typeof entry.url !== "string" || entry.url.length > 2048) return null;
    try {
      const url = new URL(entry.url);
      if (url.protocol !== "https:" || url.username || url.password) return null;
      links.push({ label, url: url.href });
    } catch { return null; }
  }
  return { id: value.id, environment, component, title, notes: value.notes, links, updatedAt: value.updatedAt };
}

/** Defensive read recovery. Reads never write repairs to storage. */
export function normalizeRunbookStore(value: unknown): RunbookStore {
  if (!ownObject(value)) return { revision: 0, runbooks: [] };
  const revision = typeof value.revision === "number" && Number.isSafeInteger(value.revision) && value.revision >= 0 ? value.revision : 0;
  if (!Array.isArray(value.runbooks)) return { revision, runbooks: [] };
  const runbooks: EnvironmentRunbook[] = [];
  const ids = new Set<string>();
  for (const raw of value.runbooks.slice(0, RUNBOOK_LIMIT)) {
    const item = validateRunbook(raw);
    if (item && !ids.has(item.id)) { ids.add(item.id); runbooks.push(item); }
  }
  return { revision, runbooks };
}

export function exportRunbooks(runbooks: EnvironmentRunbook[]): RunbookExport {
  const valid = runbooks.map(validateRunbook);
  if (valid.some((item) => !item)) throw new Error("Runbook export contains invalid data.");
  const result: RunbookExport = { format: "mpu-runbooks", version: 1, runbooks: valid as EnvironmentRunbook[] };
  if (!withinRunbookLimit(result)) throw new Error("Runbook export exceeds the 256 KB limit.");
  return result;
}

function withinRunbookLimit(value: RunbookExport | RunbookStore): boolean {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength <= RUNBOOK_JSON_LIMIT;
}

export function parseRunbookImport(json: string): EnvironmentRunbook[] {
  if (typeof json !== "string" || json.length > RUNBOOK_JSON_LIMIT) throw new Error("Import file is too large.");
  let data: unknown;
  try { data = JSON.parse(json); } catch { throw new Error("Import must be valid JSON."); }
  if (!ownObject(data) || Object.keys(data).some((key) => !["format", "version", "runbooks"].includes(key)) || data.format !== "mpu-runbooks" || data.version !== 1 || !Array.isArray(data.runbooks) || data.runbooks.length > RUNBOOK_LIMIT) throw new Error("Unsupported or invalid runbook export.");
  const items = data.runbooks.map(validateRunbook);
  if (items.some((item) => !item)) throw new Error("Import contains an invalid runbook or unsupported property.");
  const ids = new Set<string>();
  for (const item of items as EnvironmentRunbook[]) {
    if (ids.has(item.id)) throw new Error(`Import contains duplicate runbook ID “${item.id}”.`);
    ids.add(item.id);
  }
  const runbooks = items as EnvironmentRunbook[];
  if (!withinRunbookLimit({ format: "mpu-runbooks", version: 1, runbooks })) throw new Error("Import exceeds the 256 KB runbook data limit.");
  return runbooks;
}

export function findRunbookConflicts(imported: EnvironmentRunbook[], existing: EnvironmentRunbook[]): string[] {
  const ids = new Set(existing.map((item) => item.id));
  return imported.filter((item) => ids.has(item.id)).map((item) => item.id);
}

export async function loadRunbookStore(): Promise<RunbookStore> {
  try {
    const raw = await getExtensionApi().storage.local.get(RUNBOOK_STORAGE_KEY);
    return normalizeRunbookStore(raw[RUNBOOK_STORAGE_KEY]);
  } catch { throw new Error("Runbooks could not be loaded. Please retry."); }
}

export async function requestRunbookMutation(message: RunbookMutation): Promise<RunbookStore> {
  let reply: RunbookReply;
  try { reply = await getExtensionApi().runtime.sendMessage(message); }
  catch { throw new Error("Runbooks could not be saved. Please retry."); }
  if (!reply?.ok) throw new Error(reply?.error || "Runbooks could not be saved. Please retry.");
  return normalizeRunbookStore(reply.store);
}

export function isRunbookMutation(value: unknown): value is RunbookMutation {
  if (!ownObject(value) || value.type !== RUNBOOK_MESSAGE) return false;
  const keys = Object.keys(value);
  if (value.action === "save") return keys.every((key) => ["type", "action", "baseRevision", "runbook"].includes(key)) && keys.length === 4 && Number.isSafeInteger(value.baseRevision) && (value.baseRevision as number) >= 0 && !!validateRunbook(value.runbook);
  if (value.action === "delete") return keys.every((key) => ["type", "action", "baseRevision", "id"].includes(key)) && keys.length === 4 && Number.isSafeInteger(value.baseRevision) && (value.baseRevision as number) >= 0 && validId(value.id);
  return value.action === "import" && keys.every((key) => ["type", "action", "baseRevision", "runbooks"].includes(key)) && keys.length === 4 && Number.isSafeInteger(value.baseRevision) && (value.baseRevision as number) >= 0 && Array.isArray(value.runbooks) && value.runbooks.length > 0 && value.runbooks.length <= RUNBOOK_LIMIT && value.runbooks.every((item) => !!validateRunbook(item)) && new Set(value.runbooks.map((item) => (item as EnvironmentRunbook).id)).size === value.runbooks.length && withinRunbookLimit({ format: "mpu-runbooks", version: 1, runbooks: value.runbooks as EnvironmentRunbook[] });
}

/** Return fresh, whitelisted message data before any asynchronous queueing. */
function snapshotMutation(value: unknown): RunbookMutation | null {
  if (!isRunbookMutation(value)) return null;
  if (value.action === "save") return { type: RUNBOOK_MESSAGE, action: "save", baseRevision: value.baseRevision, runbook: validateRunbook(value.runbook)! };
  if (value.action === "delete") return { type: RUNBOOK_MESSAGE, action: "delete", baseRevision: value.baseRevision, id: value.id };
  return { type: RUNBOOK_MESSAGE, action: "import", baseRevision: value.baseRevision, runbooks: value.runbooks.map((item) => validateRunbook(item)!) };
}

let pending: Promise<unknown> = Promise.resolve();
const conflictReply = (): RunbookReply => ({ ok: false, error: "Runbooks changed in another view. Reload and review the latest data before saving.", conflict: true });

/** Register once in the service worker. Mutations are serialized across all extension views. */
export function registerRunbookStorage(): void {
  getExtensionApi().runtime.onMessage.addListener((message: unknown, sender, respond: (reply: RunbookReply) => void) => {
    if (!ownObject(message) || message.type !== RUNBOOK_MESSAGE) return;
    const mutation = snapshotMutation(message);
    let senderUrl: URL | null = null;
    try { if (sender.id === getExtensionApi().runtime.id && sender.url) senderUrl = new URL(sender.url); } catch { /* invalid sender */ }
    const extensionUrl = new URL(getExtensionApi().runtime.getURL("options.html"));
    if (!senderUrl || senderUrl.protocol !== extensionUrl.protocol || senderUrl.host !== extensionUrl.host || senderUrl.username || senderUrl.password || !["/options.html", "/sidepanel.html"].includes(senderUrl.pathname) || !mutation) {
      respond({ ok: false, error: "Invalid runbook request." }); return;
    }
    const task = pending.then(async (): Promise<RunbookReply> => {
      try {
        const current = await loadRunbookStore();
        if (mutation.baseRevision !== current.revision) return conflictReply();
        let runbooks = [...current.runbooks];
        if (mutation.action === "save") {
          const item = validateRunbook(mutation.runbook)!;
          const existing = runbooks.findIndex((entry) => entry.id === item.id);
          if (existing < 0 && runbooks.length >= RUNBOOK_LIMIT) return { ok: false, error: `A maximum of ${RUNBOOK_LIMIT} runbooks is allowed.` };
          if (existing < 0) runbooks.push(item); else runbooks[existing] = item;
        } else if (mutation.action === "delete") {
          runbooks = runbooks.filter((item) => item.id !== mutation.id);
        } else {
          const conflicts = findRunbookConflicts(mutation.runbooks, runbooks);
          if (conflicts.length) return { ok: false, error: `Import conflicts with existing runbook ID${conflicts.length === 1 ? "" : "s"}: ${conflicts.join(", ")}. Resolve the conflicts before importing.` };
          if (runbooks.length + mutation.runbooks.length > RUNBOOK_LIMIT) return { ok: false, error: `Import would exceed the ${RUNBOOK_LIMIT} runbook limit.` };
          runbooks.push(...mutation.runbooks.map((item) => validateRunbook(item)!));
        }
        if (!withinRunbookLimit({ revision: current.revision + 1, runbooks }) || !withinRunbookLimit({ format: "mpu-runbooks", version: 1, runbooks })) return { ok: false, error: "Runbook data would exceed the 256 KB storage/export limit." };
        if (equal(runbooks, current.runbooks)) return { ok: true, store: current };
        const next = { revision: current.revision + 1, runbooks };
        await getExtensionApi().storage.local.set({ [RUNBOOK_STORAGE_KEY]: next });
        return { ok: true, store: next };
      } catch { return { ok: false, error: "Runbooks could not be saved. Please retry." }; }
    });
    pending = task.catch(() => undefined);
    void task.then(respond);
    return true;
  });
}
