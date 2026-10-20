import { describe, expect, it, vi } from "vitest";
vi.mock("@/storage/agent-library", () => ({
  AGENT_LIBRARY_STORAGE_KEY: "mpuAgentLibrary",
  normalizeAgentLibraryPreferences: (value: unknown) => value,
  loadAgentLibraryPreferences: vi.fn(async () => ({ favoriteIds: [], recentIds: [], onboardingDismissed: false })),
  setAgentFavorite: vi.fn(async () => ({ favoriteIds: [], recentIds: [], onboardingDismissed: false })),
  recordAgentUse: vi.fn(async () => ({ favoriteIds: [], recentIds: [], onboardingDismissed: false })),
  dismissAgentOnboarding: vi.fn(), clearAgentRecents: vi.fn(),
}));
import { AGENT_REFERENCES, LOCAL_SPECIALIST_REFERENCES, agentReferenceUrl, appendAgentHelp, bindAgentLibrary, buildAgentTaskBrief, filterAgentReferences } from "@/features/agent-references";

describe("public agent references", () => {
  it("matches combined task terms and families", () => {
    expect(filterAgentReferences("  FLUID accessibility  ", "all").map((entry) => entry.id)).toEqual(["review-fluid-accessibility"]);
    expect(filterAgentReferences("", "guide").map((entry) => entry.id)).toEqual(["guide-onboarding", "guide-specialist-trainer"]);
    expect(filterAgentReferences("nonexistent", "all")).toEqual([]);
    expect(filterAgentReferences("DBA", "all").map((entry) => entry.id)).toContain("assist-performance-trace");
    expect(filterAgentReferences("", "all", "ba").every((entry) => /\bba\b/i.test(entry.audience))).toBe(true);
    expect(filterAgentReferences("", "all", "admin").map((entry) => entry.id)).toContain("assist-portal-branding");
  });

  it("creates an explicit blank request for the selected installed skill, without browser data", () => {
    const brief = buildAgentTaskBrief("assist-integrations")!;
    expect(brief).toContain("ps-assist-integrations");
    expect(brief).toContain("Desired outcome: [describe the task]");
    expect(brief).toContain("Approved sanitized evidence: [paste only the artifacts needed]");
    expect(brief).not.toContain(location.href);
    expect(buildAgentTaskBrief("invented-agent")).toBeNull();
    expect(buildAgentTaskBrief("review-data-correctness")).toContain("SQL evidence:");
    expect(buildAgentTaskBrief("assist-peoplecode")).toContain("PeopleCode event and owning row");
    expect(brief).not.toContain("Business grain / as-of date");
    expect(brief).toContain("Oracle PeopleTools 8.62 topic");
  });

  it("allows only public catalog sources and never adds page/session context", () => {
    for (const entry of [...AGENT_REFERENCES, ...LOCAL_SPECIALIST_REFERENCES]) {
      const url = new URL(agentReferenceUrl(entry.source)!);
      expect(url.origin).toBe("https://github.com");
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
    }
    for (const source of ["../../private.md", "javascript:alert(1)", "https://example.com", "assist-fluid/AGENT.md?ICSID=secret"]) expect(agentReferenceUrl(source)).toBeNull();
  });

  it("keeps help links free of referrer data in an owning document", () => {
    const doc = document.implementation.createHTMLDocument("Synthetic PeopleSoft");
    appendAgentHelp(doc, doc.body);
    const link = doc.querySelector("a")!;
    expect(link.ownerDocument).toBe(doc);
    expect(link.rel).toBe("noopener noreferrer");
    expect(link.referrerPolicy).toBe("no-referrer");
    expect(doc.body.textContent).toContain("does not send page data");
  });

  it("renders and filters without moving focus or persisting user input", async () => {
    const doc = document;
    Object.defineProperty(chrome.storage, "onChanged", { configurable: true, value: { addListener: vi.fn(), removeListener: vi.fn(), hasListener: vi.fn(), hasListeners: vi.fn() } });
    doc.body.innerHTML = '<input id="agent-search"><select id="agent-family"><option value="all">All</option><option value="review">Review</option></select><ul id="agent-list"></ul><p id="agent-results"></p><ul id="agent-templates"></ul><p id="agent-pack-version"></p><section id="agent-brief-panel" hidden><textarea id="agent-brief"></textarea><button id="agent-brief-copy">Copy</button><p id="agent-brief-status"></p></section>';
    bindAgentLibrary(doc);
    const firstPrepare = doc.querySelector<HTMLButtonElement>(".agent-prepare")!;
    firstPrepare.focus();
    await Promise.resolve();
    expect((doc.activeElement as HTMLElement).dataset.agentFocus).toBe(firstPrepare.dataset.agentFocus);
    expect(doc.querySelectorAll("#agent-list > li")).toHaveLength(24);
    expect(doc.querySelectorAll("#agent-templates a")).toHaveLength(3);
    const search = doc.getElementById("agent-search") as HTMLInputElement;
    search.focus(); search.value = "fluid accessibility"; search.dispatchEvent(new Event("input"));
    expect(doc.activeElement).toBe(search);
    expect(doc.querySelectorAll("#agent-list > li")).toHaveLength(1);
    (doc.querySelector("#agent-list button") as HTMLButtonElement).click();
    expect(doc.activeElement).toBe(doc.getElementById("agent-brief"));
    expect((doc.getElementById("agent-brief") as HTMLTextAreaElement).value).toContain("review-fluid-accessibility");
    expect(doc.getElementById("agent-brief-panel")!.hidden).toBe(false);
    search.value = "not a task"; search.dispatchEvent(new Event("input"));
    expect(doc.getElementById("agent-results")!.textContent).toContain("No prompts match");
  });
});
