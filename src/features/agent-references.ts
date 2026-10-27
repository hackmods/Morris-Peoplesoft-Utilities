import { getExtensionApi } from "../platform/browser";
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

export interface AgentTaskBriefInput {
  desiredOutcome?: string;
  toolsPatch?: string;
  applicationReleasePum?: string;
  executionContext?: string;
  expectedResult?: string;
  actualResult?: string;
  sanitizedEvidence?: string;
}

const BRIEF_LIMITS: Record<keyof AgentTaskBriefInput, number> = {
  desiredOutcome: 2000, toolsPatch: 200, applicationReleasePum: 300,
  executionContext: 1000, expectedResult: 1500, actualResult: 1500, sanitizedEvidence: 6000,
};

/** Builds a user-controlled text brief; no browser/page data is read or appended. */
export function buildAgentTaskBrief(id: string, input?: AgentTaskBriefInput): string | null {
  const agent = AGENT_REFERENCES.find((reference) => reference.id === id);
  if (!agent) return null;
  const value = (key: keyof AgentTaskBriefInput, placeholder: string) => {
    const raw = input?.[key];
    return typeof raw === "string" ? raw.slice(0, BRIEF_LIMITS[key]).trim() || placeholder : placeholder;
  };
  return [
    `Use the ${agent.id} prompt or ps-${agent.id} skill already loaded in this AI tool.`,
    `Task: ${agent.title}`,
    "",
    `Desired outcome: ${value("desiredOutcome", "[describe the task]")}`,
    `PeopleTools patch: ${value("toolsPatch", "[8.62.xx or confirmed target]")}`,
    `Application pillar / release / PUM: ${value("applicationReleasePum", "[confirm]")}`,
    `Execution / UI context: ${value("executionContext", "[online, CI, AE, IB; Classic or Fluid if relevant]")}`,
    `Expected result: ${value("expectedResult", "[describe or omit]")}`,
    `Actual result: ${value("actualResult", "[describe or omit]")}`,
    ...(/sql|query|report|performance|application-engine|conversion|data-correctness/.test(id) ? ["Database platform: [confirm]", "Business grain / as-of date: [confirm]", "SQL evidence: [sanitized SQL, binds and plan; read-only analysis first]"] : []),
    ...(/peoplecode/.test(id) ? ["PeopleCode event and owning row / scroll context: [confirm; HTML $0 is not a row path]"] : []),
    ...(/test|uat/.test(id) ? ["Acceptance criteria, user roles and test environment: [confirm]", "Expected versus observed result: [describe]"] : []),
    ...(/diagnos|trace|scheduler|integration/.test(id) ? ["Failure time, affected tier and reproduction scope: [confirm]", "Approved sanitized logs and correlation identifiers: [provide only relevant excerpts]"] : []),
    `User-provided evidence (sanitize before pasting; MPU does not redact): ${value("sanitizedEvidence", "[paste only the artifacts needed]")}`,
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
  const pendingFavorites = new Set<string>();
  let selectedId = "";
  const reportFailure = () => { status.textContent = "Unable to save library preferences. Try again."; };
  const savePreferences = (save: () => Promise<AgentLibraryPreferences>, after: () => void, failed = reportFailure) => {
    const revision = preferencesRevision;
    void save().then(value => {
      // Storage events may already contain a later update from another Options/sidebar view.
      if (preferencesRevision === revision) preferences = value;
      after();
    }).catch(failed);
  };
  const use = (id: string) => savePreferences(() => recordAgentUse(id), () => render());
  const briefPanel = doc.getElementById("agent-brief-panel");
  const brief = doc.getElementById("agent-brief") as HTMLTextAreaElement | null;
  const briefStatus = doc.getElementById("agent-brief-status");
  const copyBrief = doc.getElementById("agent-brief-copy") as HTMLButtonElement | null;
  const intakeFields: Array<[keyof AgentTaskBriefInput, string, string, number]> = [
    ["desiredOutcome", "Desired outcome", "What should the AI help you deliver?", 3],
    ["toolsPatch", "PeopleTools patch", "For example, 8.62.xx or unknown", 1],
    ["applicationReleasePum", "Application, release or PUM", "Application pillar and confirmed release / PUM", 1],
    ["executionContext", "Execution context", "Online, CI, AE, IB; Classic or Fluid if relevant", 2],
    ["expectedResult", "Expected result", "What should happen?", 2],
    ["actualResult", "Actual result", "What happened?", 2],
    ["sanitizedEvidence", "Evidence", "Paste only evidence you have already sanitized. MPU does not redact it.", 4],
  ];
  const intake = new Map<keyof AgentTaskBriefInput, HTMLTextAreaElement>();
  let lastGenerated = "";
  let pendingAgentId = "";
  let referenceLink: HTMLAnchorElement | null = null;
  if (briefPanel && brief && briefStatus) {
    const form = doc.createElement("div");
    form.id = "agent-brief-intake";
    const privacy = doc.createElement("p");
    privacy.textContent = "Complete what you know. This form stays in this page session and is not saved or sent anywhere. Sanitize evidence yourself before pasting; MPU does not redact it.";
    form.appendChild(privacy);
    for (const [key, label, hint, rows] of intakeFields) {
      const fieldLabel = doc.createElement("label");
      const input = doc.createElement("textarea");
      const inputId = `agent-brief-${key}`;
      fieldLabel.htmlFor = inputId;
      fieldLabel.textContent = label;
      input.id = inputId;
      input.rows = rows;
      input.maxLength = BRIEF_LIMITS[key];
      input.placeholder = hint;
      input.autocomplete = "off";
      input.spellcheck = false;
      input.dataset.briefInput = key;
      intake.set(key, input);
      form.append(fieldLabel, input);
    }
    referenceLink = doc.createElement("a");
    referenceLink.id = "agent-brief-reference";
    referenceLink.textContent = "View selected prompt instructions";
    referenceLink.target = "_blank";
    referenceLink.rel = "noopener noreferrer";
    referenceLink.referrerPolicy = "no-referrer";
    form.appendChild(referenceLink);
    const actions = doc.createElement("div");
    actions.className = "agent-actions";
    const generate = doc.createElement("button");
    generate.type = "button"; generate.id = "agent-brief-generate"; generate.textContent = "Generate / update preview";
    generate.addEventListener("click", () => {
      if (!selectedId) return;
      const input = Object.fromEntries(Array.from(intake.entries()).map(([key, field]) => [key, field.value])) as AgentTaskBriefInput;
      const generated = buildAgentTaskBrief(selectedId, input);
      if (generated === null) return;
      brief.value = generated; lastGenerated = generated;
      briefStatus.textContent = "Preview updated from the fields above. Review it; later edits remain until you explicitly update again.";
      brief.focus();
    });
    const clear = doc.createElement("button");
    clear.type = "button"; clear.id = "agent-brief-clear-form"; clear.textContent = "Clear form";
    clear.addEventListener("click", () => {
      for (const field of intake.values()) field.value = "";
      briefStatus.textContent = "Intake fields cleared. The preview was left as-is.";
      intake.get("desiredOutcome")?.focus();
    });
    const confirm = doc.createElement("div");
    confirm.id = "agent-brief-switch-confirm";
    confirm.hidden = true;
    confirm.setAttribute("role", "group");
    confirm.setAttribute("aria-label", "Unsaved task brief");
    const confirmText = doc.createElement("span");
    confirmText.textContent = "This brief has unsaved edits. Discard them and switch prompts? ";
    const discard = doc.createElement("button"); discard.type = "button"; discard.textContent = "Discard and switch";
    discard.addEventListener("click", () => {
      const target = pendingAgentId;
      confirm.hidden = true; pendingAgentId = "";
      if (target) selectAgent(target);
    });
    const cancel = doc.createElement("button"); cancel.type = "button"; cancel.textContent = "Keep editing";
    cancel.addEventListener("click", () => { pendingAgentId = ""; confirm.hidden = true; brief.focus(); });
    confirm.append(confirmText, discard, cancel);
    actions.append(generate, clear, confirm);
    form.appendChild(actions);
    const briefLabel = briefPanel.querySelector<HTMLLabelElement>('label[for="agent-brief"]');
    briefPanel.insertBefore(form, briefLabel || brief);
  }
  const hasUnsavedBrief = () => Boolean(brief && (brief.value !== lastGenerated || Array.from(intake.values()).some((field) => field.value.trim())));
  const selectAgent = (id: string) => {
    if (selectedId === id && brief) {
      pendingAgentId = "";
      const confirmation = doc.getElementById("agent-brief-switch-confirm");
      if (confirmation) confirmation.hidden = true;
      if (briefPanel) briefPanel.hidden = false;
      brief.focus();
      return;
    }
    const generated = buildAgentTaskBrief(id);
    if (!generated || !brief) return;
    selectedId = id;
    pendingAgentId = "";
    const confirmation = doc.getElementById("agent-brief-switch-confirm");
    if (confirmation) confirmation.hidden = true;
    for (const field of intake.values()) field.value = "";
    brief.value = generated; lastGenerated = generated;
    const agent = AGENT_REFERENCES.find((entry) => entry.id === id)!;
    if (referenceLink) { referenceLink.href = agentReferenceUrl(agent.source)!; referenceLink.setAttribute("aria-label", `View prompt instructions for ${agent.title}`); }
    use(id);
    if (briefPanel) briefPanel.hidden = false;
    if (briefStatus) briefStatus.textContent = `Blank task brief for ${agent.title}. No PeopleSoft page data was added.`;
    brief.focus(); brief.setSelectionRange(0, 0); brief.scrollTop = 0;
  };
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
          if (selectedId && agent.id !== selectedId && hasUnsavedBrief()) {
            pendingAgentId = agent.id;
            const confirmation = doc.getElementById("agent-brief-switch-confirm");
            if (confirmation) { confirmation.hidden = false; confirmation.querySelector("button")?.focus(); }
            if (briefStatus) briefStatus.textContent = "Review the unsaved edits before switching prompts.";
            return;
          }
          selectAgent(agent.id);
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
      if (pendingFavorites.has(agent.id)) favorite.setAttribute("aria-disabled", "true");
      favorite.addEventListener("click", () => {
        if (pendingFavorites.has(agent.id)) return;
        pendingFavorites.add(agent.id); favorite.setAttribute("aria-disabled", "true");
        savePreferences(() => setAgentFavorite(agent.id, !isFavorite), () => {
          pendingFavorites.delete(agent.id); render();
        }, () => { pendingFavorites.delete(agent.id); render(); reportFailure(); });
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
    savePreferences(dismissAgentOnboarding, () => { if (onboarding) onboarding.hidden = preferences.onboardingDismissed; search.focus(); });
  });
  doc.getElementById("agent-clear-recents")?.addEventListener("click", () => {
    savePreferences(clearAgentRecents, () => render());
  });
  doc.getElementById("agent-brief-reset")?.addEventListener("click", () => {
    if (brief && selectedId) {
      for (const field of intake.values()) field.value = "";
      pendingAgentId = "";
      const confirmation = doc.getElementById("agent-brief-switch-confirm");
      if (confirmation) confirmation.hidden = true;
      brief.value = buildAgentTaskBrief(selectedId)!; lastGenerated = brief.value;
      if (briefStatus) briefStatus.textContent = "Reset to a blank brief. Intake fields and manual preview edits were cleared.";
      brief.focus();
    }
  });
  render();
  const synchronize = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== "local" || !changes[AGENT_LIBRARY_STORAGE_KEY]) return;
    preferencesRevision += 1;
    preferences = normalizeAgentLibraryPreferences(changes[AGENT_LIBRARY_STORAGE_KEY].newValue);
    if (onboarding) onboarding.hidden = preferences.onboardingDismissed;
    render();
  };
  getExtensionApi().storage.onChanged.addListener(synchronize);
  doc.defaultView?.addEventListener("pagehide", () => getExtensionApi().storage.onChanged.removeListener(synchronize), { once: true });
  void loadAgentLibraryPreferences().then((value) => {
    if (preferencesRevision) return;
    preferences = value;
    if (onboarding) onboarding.hidden = value.onboardingDismissed;
    render();
  }).catch(() => { status.textContent = "Library ready. Saved preferences are unavailable."; });
}
