import { AGENT_REFERENCES } from "../generated/agent-catalog";

export const AGENT_LIBRARY_STORAGE_KEY = "mpuAgentLibrary";
export const AGENT_LIBRARY_MESSAGE = "mpu-agent-library-write";
export interface AgentLibraryPreferences {
  favoriteIds: string[];
  recentIds: string[];
  onboardingDismissed: boolean;
}
export type AgentLibraryMutation =
  | { type: typeof AGENT_LIBRARY_MESSAGE; action: "favorite"; id: string; favorite: boolean }
  | { type: typeof AGENT_LIBRARY_MESSAGE; action: "use"; id: string }
  | { type: typeof AGENT_LIBRARY_MESSAGE; action: "dismiss" | "clear-recents" };
export type AgentLibraryReply = { ok: true; preferences: AgentLibraryPreferences } | { ok: false; error: string };
const knownIds = new Set<string>(AGENT_REFERENCES.map((agent) => agent.id));
export const isKnownAgentId = (id: unknown): id is string => typeof id === "string" && knownIds.has(id);

/** Recover only public catalog IDs and preference flags; reads never repair storage. */
export function normalizeAgentLibraryPreferences(value: unknown): AgentLibraryPreferences {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const ids = (value: unknown): string[] => Array.isArray(value) ? [...new Set(value.filter(isKnownAgentId))] : [];
  return { favoriteIds: ids(raw.favoriteIds), recentIds: ids(raw.recentIds).slice(0, 6), onboardingDismissed: raw.onboardingDismissed === true };
}

export async function loadAgentLibraryPreferences(): Promise<AgentLibraryPreferences> {
  try {
    const stored = await chrome.storage.local.get(AGENT_LIBRARY_STORAGE_KEY);
    return normalizeAgentLibraryPreferences(stored[AGENT_LIBRARY_STORAGE_KEY]);
  } catch {
    throw new Error("Agent library preferences could not be loaded. Please retry.");
  }
}

async function mutate(message: AgentLibraryMutation): Promise<AgentLibraryPreferences> {
  let reply: AgentLibraryReply;
  try { reply = await chrome.runtime.sendMessage(message); }
  catch { throw new Error("Agent library preferences could not be saved. Please retry."); }
  if (!reply?.ok) throw new Error(reply?.error || "Agent library preferences could not be saved. Please retry.");
  return normalizeAgentLibraryPreferences(reply.preferences);
}

export async function setAgentFavorite(id: string, favorite: boolean): Promise<AgentLibraryPreferences> {
  if (!isKnownAgentId(id) || typeof favorite !== "boolean") throw new Error("Invalid agent favorite.");
  return mutate({ type: AGENT_LIBRARY_MESSAGE, action: "favorite", id, favorite });
}
export async function recordAgentUse(id: string): Promise<AgentLibraryPreferences> {
  if (!isKnownAgentId(id)) throw new Error("Unknown agent reference.");
  return mutate({ type: AGENT_LIBRARY_MESSAGE, action: "use", id });
}
export const dismissAgentOnboarding = (): Promise<AgentLibraryPreferences> => mutate({ type: AGENT_LIBRARY_MESSAGE, action: "dismiss" });
export const clearAgentRecents = (): Promise<AgentLibraryPreferences> => mutate({ type: AGENT_LIBRARY_MESSAGE, action: "clear-recents" });
