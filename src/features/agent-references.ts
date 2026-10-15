import { AGENT_PACK_VERSION, AGENT_REFERENCES, LOCAL_SPECIALIST_REFERENCES } from "../generated/agent-catalog";

export { AGENT_PACK_VERSION, AGENT_REFERENCES, LOCAL_SPECIALIST_REFERENCES };
export const AGENT_PACK_GUIDE_URL = "https://github.com/hackmods/Morris-Peoplesoft-Utilities/tree/main/agents";
export const AGENT_PACK_RELEASES_URL = "https://github.com/hackmods/Morris-Peoplesoft-Utilities/releases";
const SOURCE_BASE = "https://github.com/hackmods/Morris-Peoplesoft-Utilities/blob/main/agents/";

export type AgentReference = typeof AGENT_REFERENCES[number];
export type AgentFamily = "all" | "assist" | "review" | "design" | "guide";

export function filterAgentReferences(query: string, family: AgentFamily): readonly AgentReference[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return AGENT_REFERENCES.filter((agent) => {
    const text = `${agent.id} ${agent.title} ${agent.description} ${agent.audience}`.toLowerCase();
    return (family === "all" || agent.id.startsWith(`${family}-`)) && terms.every((term) => text.includes(term));
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
    "Database platform: [if relevant]",
    "Execution / UI context: [online, CI, AE, IB; Classic or Fluid if relevant]",
    "Business grain / as-of date: [if relevant]",
    "Approved sanitized evidence: [paste only the artifacts needed]",
    "",
    "Separate confirmed evidence, assumptions and unknowns. Provide a reviewable recommendation and validation steps; label unexecuted examples.",
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
  if (version) version.textContent = `Prompt catalog v${AGENT_PACK_VERSION}`;
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
    const selected: AgentFamily = ["assist", "review", "design", "guide"].includes(family.value) ? family.value as AgentFamily : "all";
    const matches = filterAgentReferences(search.value, selected);
    list.replaceChildren();
    status.textContent = matches.length ? `${matches.length} of ${AGENT_REFERENCES.length} prompts shown.` : "No prompts match. Try another search or task type.";
    for (const agent of matches) {
      const item = doc.createElement("li");
      const heading = doc.createElement("h3");
      const url = agentReferenceUrl(agent.source)!;
      heading.append(externalReferenceLink(doc, url, agent.title));
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
        prepare.className = "agent-prepare";
        prepare.textContent = "Prepare task brief";
        prepare.setAttribute("aria-label", `Prepare task brief for ${agent.title}`);
        prepare.addEventListener("click", () => {
          brief.value = buildAgentTaskBrief(agent.id)!;
          briefPanel.hidden = false;
          briefStatus.textContent = `Blank task brief for ${agent.title}. No PeopleSoft page data was added.`;
          brief.focus();
          brief.setSelectionRange(0, 0);
          brief.scrollTop = 0;
        });
        item.appendChild(prepare);
      }
      list.appendChild(item);
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
  render();
}
