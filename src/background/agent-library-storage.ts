import {
  AGENT_LIBRARY_MESSAGE, AGENT_LIBRARY_STORAGE_KEY, isKnownAgentId, loadAgentLibraryPreferences,
  type AgentLibraryMutation, type AgentLibraryReply,
} from "../storage/agent-library";

function validMutation(value: unknown): value is AgentLibraryMutation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  if (input.type !== AGENT_LIBRARY_MESSAGE) return false;
  const allowed = input.action === "favorite" ? ["type", "action", "id", "favorite"]
    : input.action === "use" ? ["type", "action", "id"] : ["type", "action"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) return false;
  if (input.action === "favorite") return isKnownAgentId(input.id) && typeof input.favorite === "boolean";
  if (input.action === "use") return isKnownAgentId(input.id);
  return input.action === "dismiss" || input.action === "clear-recents";
}

function trustedSender(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || !sender.url) return false;
  try {
    const url = new URL(sender.url);
    url.hash = "";
    url.search = "";
    return ["options.html", "sidepanel.html"].some((page) => url.href === chrome.runtime.getURL(page));
  } catch { return false; }
}

/** A single worker queue serializes intentions from every Options/side-panel view. */
export function registerAgentLibraryStorage(): void {
  let pending: Promise<unknown> = Promise.resolve();
  chrome.runtime.onMessage.addListener((message: unknown, sender, respond: (reply: AgentLibraryReply) => void) => {
    if (!message || typeof message !== "object" || (message as Record<string, unknown>).type !== AGENT_LIBRARY_MESSAGE) return;
    if (!trustedSender(sender) || !validMutation(message)) {
      respond({ ok: false, error: "Invalid agent library request." });
      return;
    }
    const task = pending.then(async (): Promise<AgentLibraryReply> => {
      try {
        const preferences = await loadAgentLibraryPreferences();
        switch (message.action) {
          case "favorite":
            preferences.favoriteIds = preferences.favoriteIds.filter((id) => id !== message.id);
            if (message.favorite) preferences.favoriteIds.push(message.id);
            break;
          case "use": preferences.recentIds = [message.id, ...preferences.recentIds.filter((id) => id !== message.id)].slice(0, 6); break;
          case "dismiss": preferences.onboardingDismissed = true; break;
          case "clear-recents": preferences.recentIds = []; break;
        }
        await chrome.storage.local.set({ [AGENT_LIBRARY_STORAGE_KEY]: preferences });
        return { ok: true, preferences };
      } catch { return { ok: false, error: "Agent library preferences could not be saved. Please retry." }; }
    });
    pending = task.catch(() => undefined);
    void task.then(respond);
    return true;
  });
}
