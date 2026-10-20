import { AGENT_PACK_VERSION, AGENT_REFERENCES, LOCAL_SPECIALIST_REFERENCES } from "../generated/agent-catalog";
import { AGENT_LIBRARY_STORAGE_KEY, normalizeAgentLibraryPreferences, loadAgentLibraryPreferences, setAgentFavorite, recordAgentUse, dismissAgentOnboarding, clearAgentRecents, type AgentLibraryPreferences } from "../storage/agent-library";

export { AGENT_PACK_VERSION, AGENT_REFERENCES, LOCAL_SPECIALIST_REFERENCES };
export const AGENT_PACK_GUIDE_URL = "https://github.com/hackmods/Morris-Peoplesoft-Utilities/tree/main/agents";
export const AGENT_PACK_RELEASES_URL = "https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases";
const SOURCE_BASE = "https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/";

export type AgentReference = typeof AGENT_REFERENCES[number];
export type AgentFamily = "all" | "assist" | "review" | "design" | "guide";
export type AgentAudience = "all" | "ba" | "developer" | "admin";

export function filterAgentReferences(query: string, family: AgentFamily, audience: AgentAudience = "all"): readonly AgentReference[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return AGENT_REFERENCES.filter((agent) => {
    const text = `${agent.id} ${agent.title} ${agent.description} ${agent.audience}`.toLowerCase();
    return (family === "all" || agent.id.startsWith(`${family}-`)) &&
      (audience === "all" || new RegExp(`\\b${audience}(?:istrator)?\\b`, "i").test(agent.audience)) && terms.every((term) => text.includes(term));
  });
}

/** Only catalog-owned public paths; never append page context, values, URLs or tokens. */
export function agentReferenceUrl(source: string): string | null {
  const known = [...AGENT_REFERENCES, ...LOCAL_SPECIALIST_REFERENCES].some((reference) => reference.source === source);
  return known ? SOURCE_BASE + source : null;
}

/** Blank request scaffold only; callers cannot supply live page or field context. */
export function buildAgentTaskBrief(id: string): string | null {
  const agent = AGENT_REFERENCES.find((reference) => reference.id === id);
  if (!agent) return null;
  return [
    `Use the ${agent.id} prompt or ps-${agent.id} skill already loaded in this AI tool.`,
    `Task: ${agent.title}`,
    "",
    "Desired outcome: [describe the task]",
    "PeopleTools patch: [8.62.xx or confirmed target]",
    "Application pillar / release / PUM: [confirm]",
    "Execution / UI context: [online, CI, AE, IB; Classic or Fluid if relevant]",
    ...(/sql|query|report|performance|application-engine|conversion|data-correctness/.test(id) ? ["Database platform: [confirm]", "Business grain / as-of date: [confirm]", "SQL evidence: [sanitized SQL, binds and plan; read-only analysis first]"] : []),
    ...(/peoplecode/.test(id) ? ["PeopleCode event and owning row / scroll context: [confirm; HTML $0 is not a row path]"] : []),
    ...(/test|uat/.test(id) ? ["Acceptance criteria, user roles and test environment: [confirm]", "Expected versus observed result: [describe]"] : []),
    ...(/diagnos|trace|scheduler|integration/.test(id) ? ["Failure time, affected tier and reproduction scope: [confirm]", "Approved sanitized logs and correlation identifiers: [provide only relevant excerpts]"] : []),
    "Approved sanitized evidence: [paste only the artifacts needed]",
    "",
    "Separate confirmed evidence, assumptions and unknowns. Provide a reviewable recommendation and validation steps; label unexecuted examples.",
    "For version-specific behavior, consult the relevant Oracle PeopleTools 8.62 topic for this task and cite the exact section. Confirm the patch separately; identify documentation gaps instead of inventing delivered identifiers.",
    "Do not request credentials or invent local keys, objects, roles or buffer paths. This request does not authorize production writes or business-process replay.",
  ].join("\n");
}

export function externalReferenceLink(doc: Document, url: string, label: string): HTMLAnchorElement {
  const link = doc.createElement("a");
  link.href = url;
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.referrerPolicy = "no-referrer";
  return link;
}

/** Existing Help dialog uses public references; no AI/network action happens during rendering. */
export function appendAgentHelp(doc: Document, container: HTMLElement): void {
  const heading = doc.createElement("h3");
  heading.textContent = "PeopleSoft agent prompts";
  const intro = doc.createElement("p");
  intro.textContent = "Find prompts for PeopleCode, SQL, batch, Fluid, accessibility and BA work. Use them in your approved AI tool; MPU does not send page data to AI services.";
  const links = doc.createElement("p");
  links.append(externalReferenceLink(doc, AGENT_PACK_GUIDE_URL, "Browse prompts and setup on GitHub"));
  container.append(heading, intro, links);
}

export function bindAgentLibrary(doc: Document): void {
  const search = doc.getElementById("agent-search") as HTMLInputElement | null;
  const family = doc.getElementById("agent-family") as HTMLSelectElement | null;
  const list = doc.getElementById("agent-list");
  const status = doc.getElementById("agent-results");
  const templates = doc.getElementById("agent-templates");
  if (!search || !family || !list || !status || !templates) return;
  const version = doc.getElementById("agent-pack-version");
  if (version) version.textContent = `Bundled prompt catalog v${AGENT_PACK_VERSION}. Release assets may differ; no automatic update check.`;
  const audience = doc.getElementById("agent-audience") as HTMLSelectElement | null;
  const view = doc.getElementById("agent-view") as HTMLSelectElement | null;
  const onboarding = doc.getElementById("agent-onboarding");
  let preferences: AgentLibraryPreferences = { favoriteIds: [], recentIds: [], onboardingDismissed: false };
  let preferencesRevision = 0;
  let selectedId = "";
  const reportFailure = () => { status.textContent = "Unable to save library preferences. Try again."; };
  const use = (id: string) => { void recordAgentUse(id).then((value) => { preferences = value; }).catch(reportFailure); };
  const briefPanel = doc.getElementById("agent-brief-panel");
  const brief = doc.getElementById("agent-brief") as HTMLTextAreaElement | null;
  const briefStatus = doc.getElementById("agent-brief-status");
  const copyBrief = doc.getElementById("agent-brief-copy") as HTMLButtonElement | null;
  if (brief && briefStatus && copyBrief) copyBrief.addEventListener("click", async () => {
    try {
      await doc.defaultView!.navigator.clipboard.writeText(brief.value);
      briefStatus.textContent = "Task brief copied. Load the selected prompt or skill in your AI tool before using it.";
    } catch {
      brief.focus(); brief.select();
      briefStatus.textContent = "Automatic copy is unavailable. The brief is selected; use your keyboard to copy it.";
    }
  });
  const render = () => {
    const focusedKey = (doc.activeElement as HTMLElement | null)?.dataset.agentFocus;
    const selected: AgentFamily = ["assist", "review", "design", "guide"].includes(family.value) ? family.value as AgentFamily : "all";
    const selectedAudience = ["ba", "developer", "admin"].includes(audience?.value || "") ? audience!.value as AgentAudience : "all";
    let matches = filterAgentReferences(search.value, selected, selectedAudience);
    if (view?.value === "favorites") matches = matches.filter((agent) => preferences.favoriteIds.includes(agent.id));
    if (view?.value === "recent") matches = preferences.recentIds.flatMap((id) => matches.filter((agent) => agent.id === id));
    list.replaceChildren();
    status.textContent = matches.length ? `${matches.length} of ${AGENT_REFERENCES.length} prompts shown.` : "No prompts match. Try another search or task type.";
    if (!matches.length && !search.value && selected === "all" && selectedAudience === "all") {
      if (view?.value === "favorites") status.textContent = "No favorite prompts yet. Choose All prompts and Add favorite to keep a specialist here.";
      if (view?.value === "recent") status.textContent = "No recent prompts yet. View instructions or prepare a task brief to add a specialist here.";
    }
    for (const agent of matches) {
      const item = doc.createElement("li");
      const heading = doc.createElement("h3");
      const url = agentReferenceUrl(agent.source)!;
      heading.append(externalReferenceLink(doc, url, agent.title));
      heading.querySelector("a")!.dataset.agentFocus = `${agent.id}:title`;
      heading.querySelector("a")!.addEventListener("click", () => use(agent.id));
      const description = doc.createElement("p");
      description.textContent = agent.description;
      const identity = doc.createElement("p");
      identity.className = "agent-id";
      identity.textContent = `${agent.id}${agent.kind === "guide" ? " · Specialist-building guide" : ""}`;
      const audience = doc.createElement("p");
      audience.className = "agent-id";
      audience.textContent = `For: ${agent.audience}`;
      item.append(heading, description, identity, audience);
      if (brief && briefPanel && briefStatus) {
        const prepare = doc.createElement("button");
        prepare.type = "button";
        prepare.dataset.agentFocus = `${agent.id}:prepare`;
        prepare.className = "agent-prepare";
        prepare.textContent = "Prepare task brief";
        prepare.setAttribute("aria-label", `Prepare task brief for ${agent.title}`);
        prepare.addEventListener("click", () => {
          selectedId = agent.id;
          use(agent.id);
          brief.value = buildAgentTaskBrief(agent.id)!;
          briefPanel.hidden = false;
          briefStatus.textContent = `Blank task brief for ${agent.title}. No PeopleSoft page data was added.`;
          brief.focus();
          brief.setSelectionRange(0, 0);
          brief.scrollTop = 0;
        });
        item.appendChild(prepare);
      }
      const actions = doc.createElement("p");
      actions.className = "agent-actions";
      const instructions = externalReferenceLink(doc, url, "View instructions");
      instructions.dataset.agentFocus = `${agent.id}:instructions`;
      instructions.setAttribute("aria-label", `View instructions for ${agent.title}`);
      instructions.addEventListener("click", () => use(agent.id));
      const favorite = doc.createElement("button");
      favorite.type = "button";
      favorite.dataset.agentFocus = `${agent.id}:favorite`;
      const isFavorite = preferences.favoriteIds.includes(agent.id);
      favorite.textContent = isFavorite ? "Remove favorite" : "Add favorite";
      favorite.setAttribute("aria-label", `${favorite.textContent}: ${agent.title}`);
      favorite.setAttribute("aria-pressed", String(isFavorite));
      favorite.addEventListener("click", () => {
        favorite.disabled = true;
        void setAgentFavorite(agent.id, !isFavorite).then((value) => {
          preferences = value;
          render();
        }).catch(() => { favorite.disabled = false; reportFailure(); });
      });
      favorite.dataset.favorite = agent.id;
      actions.append(instructions, favorite);
      item.appendChild(actions);
      list.appendChild(item);
    }
    if (focusedKey) {
      const replacement = Array.from(list.querySelectorAll<HTMLElement>("[data-agent-focus]")).find((control) => control.dataset.agentFocus === focusedKey);
      (replacement || view || search).focus();
    }
  };
  templates.replaceChildren();
  for (const template of LOCAL_SPECIALIST_REFERENCES) {
    const item = doc.createElement("li");
    item.append(externalReferenceLink(doc, agentReferenceUrl(template.source)!, template.title));
    templates.appendChild(item);
  }
  search.addEventListener("input", render);
  family.addEventListener("change", render);
  audience?.addEventListener("change", render);
  view?.addEventListener("change", render);
  doc.querySelectorAll<HTMLButtonElement>("[data-agent-task]").forEach((button) => button.addEventListener("click", () => {
    search.value = button.dataset.agentTask || "";
    family.value = "all";
    if (audience) audience.value = "all";
    if (view) view.value = "all";
    render();
    search.focus();
  }));
  doc.getElementById("agent-dismiss-onboarding")?.addEventListener("click", () => {
    void dismissAgentOnboarding().then((value) => { preferences = value; if (onboarding) onboarding.hidden = true; search.focus(); }).catch(reportFailure);
  });
  doc.getElementById("agent-clear-recents")?.addEventListener("click", () => {
    void clearAgentRecents().then((value) => { preferences = value; render(); }).catch(reportFailure);
  });
  doc.getElementById("agent-brief-reset")?.addEventListener("click", () => {
    if (brief && selectedId) { brief.value = buildAgentTaskBrief(selectedId)!; brief.focus(); }
  });
  render();
  const synchronize = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== "local" || !changes[AGENT_LIBRARY_STORAGE_KEY]) return;
    preferencesRevision += 1;
    preferences = normalizeAgentLibraryPreferences(changes[AGENT_LIBRARY_STORAGE_KEY].newValue);
    if (onboarding) onboarding.hidden = preferences.onboardingDismissed;
    render();
  };
  chrome.storage.onChanged.addListener(synchronize);
  doc.defaultView?.addEventListener("pagehide", () => chrome.storage.onChanged.removeListener(synchronize), { once: true });
  void loadAgentLibraryPreferences().then((value) => {
    if (preferencesRevision) return;
    preferences = value;
    if (onboarding) onboarding.hidden = value.onboardingDismissed;
    render();
  }).catch(() => { status.textContent = "Library ready. Saved preferences are unavailable."; });
}
